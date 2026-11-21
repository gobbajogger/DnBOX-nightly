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
from urllib.parse import urlsplit
from urllib.request import urlopen


PUBLISHED_PAGES_COMMIT = "83406c1d665d4194ad9011c7de6242fcb6c9ceb7"


@lru_cache(maxsize=4)
def read_package(url, size, digest, directory, root=None):
    prefix = f"https://gobbajogger.github.io/DnBOX-nightly/artifacts/nightly-dev/{digest}/"
    filename = Path(urlsplit(url).path).name
    if not re.fullmatch(r"[0-9a-f]{64}", digest) or not re.fullmatch(r"[A-Za-z0-9._-]+\.fwsc", filename):
        raise ValueError("Invalid visual package identity")
    if url != prefix + filename or not isinstance(size, int) or size <= 0:
        raise ValueError("Invalid visual package URL or size")
    cache_home = Path(os.environ.get("XDG_CACHE_HOME", Path.home() / ".cache"))
    cached = cache_home / "dnbox" / "visual-packages" / digest / filename
    supplied = Path(directory) / filename if directory else cached
    downloaded = False
    if directory or supplied.is_file():
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


def route_default_package(page, root):
    html = (root / "web/product-site/install/index.html").read_text(encoding="utf-8")
    marker = "\nconst catalog = "
    if html.count(marker) != 1:
        raise ValueError("Mounted Installer must declare exactly one inline release catalog")
    catalog, _ = json.JSONDecoder().raw_decode(html.split(marker, 1)[1])
    selected = next(version for version in catalog["versions"] if version["version"] == catalog["latest"])
    package = selected["models"]["pro"]
    url = package["pkg"]
    data = read_package(url, package["size"], package["sha256"], os.environ.get("DNBOX_VISUAL_PACKAGE_DIR"), root)
    page.route(url, lambda route: route.fulfill(
        status=200, content_type="application/octet-stream",
        headers={"Access-Control-Allow-Origin": "*"}, body=data))
    return Path(urlsplit(url).path).name


def wait_for_admission(page, filename):
    page.wait_for_function("""name => {
        const download = document.querySelector('#download');
        return download && !download.hidden && download.download === name && download.href.startsWith('blob:');
    }""", arg=filename)
