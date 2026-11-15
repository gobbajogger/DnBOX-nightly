// Preserve previously published original manual chapter bookmarks without mislabelling their version.
if(/^#s(?:[1-9]|1[0-9])$/.test(location.hash))location.replace('original/'+location.hash);
