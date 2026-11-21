# SPDX-License-Identifier: GPL-3.0-only
"""Use the released package bytes with the mounted installer's normal browser admission."""
from functools import lru_cache
from hashlib import sha256
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile
from urllib.parse import urlencode, urlsplit
from urllib.request import urlopen


PUBLISHED_PAGES_COMMIT = "83406c1d665d4194ad9011c7de6242fcb6c9ceb7"


def package_filename(url, size, digest):
    prefix = f"https://gobbajogger.github.io/DnBOX-nightly/artifacts/nightly-dev/{digest}/"
    filename = Path(urlsplit(url).path).name
    if not re.fullmatch(r"[0-9a-f]{64}", digest) or not re.fullmatch(r"[A-Za-z0-9._-]+\.fwsc", filename):
        raise ValueError("Invalid visual package identity")
    if url != prefix + filename or not isinstance(size, int) or size <= 0:
        raise ValueError("Invalid visual package URL or size")
    return filename


@lru_cache(maxsize=4)
def read_package(url, size, digest, directory, root=None, release_file=None):
    filename = package_filename(url, size, digest)
    cache_home = Path(os.environ.get("XDG_CACHE_HOME", Path.home() / ".cache"))
    cached = cache_home / "dnbox" / "visual-packages" / digest / filename
    supplied = Path(directory) / filename if directory else release_file or cached
    downloaded = False
    if directory or release_file or supplied.is_file():
        with supplied.open("rb") as stream:
            data = stream.read(size + 1)
    else:
        object_path = f"{PUBLISHED_PAGES_COMMIT}:artifacts/nightly-dev/{digest}/{filename}"
        result = subprocess.run(["git", "cat-file", "blob", object_path], cwd=root,
                                stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
        if result.returncode == 0:
            data = result.stdout
        else:
            with urlopen(url, timeout=20) as response:
                if response.geturl() != url or response.headers.get("Access-Control-Allow-Origin") != "*":
                    raise ValueError("Published visual package URL or CORS changed")
                data = response.read(size + 1)
            downloaded = True
    if len(data) != size or sha256(data).hexdigest() != digest:
        raise ValueError(f"Size or SHA-256 mismatch for {filename}")
    if downloaded:
        cached.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.NamedTemporaryFile(dir=cached.parent, delete=False) as stream:
            temporary = Path(stream.name)
            try:
                stream.write(data)
                stream.flush()
                os.replace(temporary, cached)
            finally:
                temporary.unlink(missing_ok=True)
    return data


def installer_responses(root):
    """Attach only the opening report search and the default release package."""
    report_url = "https://api.github.com/search/issues?" + urlencode({
        "q": 'repo:gobbajogger/DnBOX is:issue in:title "Install report"', "per_page": 100, "page": 1,
    })
    html = (root / "web/product-site/install/index.html").read_text(encoding="utf-8")
    marker = "\nconst catalog = "
    if html.count(marker) != 1:
        raise ValueError("Mounted Installer must declare exactly one inline release catalog")
    catalog, _ = json.JSONDecoder().raw_decode(html.split(marker, 1)[1])
    latest = catalog["latest"]
    selected = next((row for row in catalog["versions"] if row["version"] == latest), None)
    if latest is not None and selected is None:
        raise ValueError("Mounted Installer catalog is missing its latest release")
    models = selected["models"] if selected else {}
    model = next((key for key in ("pro", "elite", "mke") if models.get(key)), None)
    package = models.get(model)
    filename = package_filename(package["pkg"], package["size"], package["sha256"]) if package else None
    release_file = None
    directory = os.environ.get("DNBOX_VISUAL_PACKAGE_DIR")
    release_root = os.environ.get("DNBOX_RELEASE_PACKAGES")
    if package and release_root and not directory:
        version = selected["display_version"]
        if not re.fullmatch(r"\d+(?:\.\d+){2,3}", version):
            raise ValueError("Unexpected release package version")
        release_file = Path(release_root) / f"v{version}" / f"dnbox-x0x37-{version}-{model}.fwsc"

    def report(route):
        if route.request.method != "GET":
            return route.fallback()
        route.fulfill(json={"total_count": 0, "incomplete_results": False, "items": []},
                      headers={"Access-Control-Allow-Origin": "*"})

    def respond(route):
        if route.request.method != "GET":
            return route.fallback()
        data = read_package(package["pkg"], package["size"], package["sha256"], directory,
                            root, release_file)
        route.fulfill(body=data, content_type="application/octet-stream",
                      headers={"Access-Control-Allow-Origin": "*"})

    def attach(page, *, require_package=False):
        if require_package and not package:
            raise ValueError("Mounted Installer requires a default release package")
        page.route(re.compile("^" + re.escape(report_url) + "$"), report)
        if package:
            url = package["pkg"]
            page.route(re.compile("^" + re.escape(url) + "$"), respond)
        return filename

    return attach


def wait_for_admission(page, filename):
    page.wait_for_function("""name => {
        const download = document.querySelector('#download');
        return download && !download.hidden && download.download === name && download.href.startsWith('blob:');
    }""", arg=filename)
