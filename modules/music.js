export function albumArtist(album) {
  if (album?.AlbumArtist) {
    const clean = album.AlbumArtist.toString().trim();
    if (clean) {
      return clean;
    }
  }
  if (Array.isArray(album?.Artists) && album.Artists.length) {
    const joined = album.Artists.join(", ").trim();
    if (joined) {
      return joined;
    }
  }
  return "Unknown artist";
}

export function albumTitle(album) {
  if (album && typeof album.Name === "string") {
    const clean = album.Name.trim();
    if (clean) {
      return clean;
    }
  }
  return "Untitled";
}

export function albumSortKey(album) {
  const artist =
    album?.AlbumArtist ||
    (Array.isArray(album?.Artists) && album.Artists.length ? album.Artists[0] : "") ||
    "";
  const title = album?.SortName || album?.Name || "";
  return {
    artist: artist.toString(),
    title: title.toString(),
  };
}

export function compareAlbumKeys(left, right) {
  const artistLeft = left.artist.toLowerCase();
  const artistRight = right.artist.toLowerCase();
  if (artistLeft < artistRight) {
    return -1;
  }
  if (artistLeft > artistRight) {
    return 1;
  }
  const titleLeft = left.title.toLowerCase();
  const titleRight = right.title.toLowerCase();
  if (titleLeft < titleRight) {
    return -1;
  }
  if (titleLeft > titleRight) {
    return 1;
  }
  return 0;
}
