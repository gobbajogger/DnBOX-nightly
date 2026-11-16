# Past-defect fixtures

`grid-before.html` is the minimized actual PR1329809abc CSS layer ordering: the vertical gradients were on the grid background, then black-key rectangles covered them. It intentionally fails the same128-row pixel assertion used on the candidate. User-marked original screenshots are retained privately; they are not copied into the public source fixture.

`page-01.png` is the selected header reference,2880×1800,SHA256`c9f6c4fc91543ac8f3659fd6a48956234a36ee48c781532e2b2623b1fe0a6a72`. It is not a canonical image for every other screen.

A deterministic old-input failure followed by a changed-input pass is regression proof. Same-input attempts are counted separately and never silently reset. Pending canonical approval, unverified Git revision, unsupported native playback and semantic automation limits remain non-passing in the defect report.
