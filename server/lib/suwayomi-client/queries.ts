// GraphQL queries and mutations for Suwayomi API

export const SOURCES_QUERY = `
query Sources {
  sources {
    nodes {
      id
      name
      lang
      iconUrl
      supportsLatest
      isNsfw
    }
  }
}
`

export const SOURCE_QUERY = `
query Source($id: LongString!) {
  source(id: $id) {
    id
    name
    lang
    iconUrl
    supportsLatest
    isNsfw
  }
}
`

export const FETCH_SOURCE_MANGA_MUTATION = `
mutation FetchSourceManga($input: FetchSourceMangaInput!) {
  fetchSourceManga(input: $input) {
    mangas {
      id
      title
      url
      realUrl
      thumbnailUrl
      author
      artist
      description
      status
      genre
    }
    hasNextPage
  }
}
`

export const FETCH_MANGA_MUTATION = `
mutation FetchManga($id: Int!) {
  fetchManga(input: { id: $id }) {
    manga {
      id
      title
      url
      realUrl
      author
      artist
      description
      status
      genre
      thumbnailUrl
    }
  }
}
`

export const FETCH_CHAPTERS_MUTATION = `
mutation FetchChapters($mangaId: Int!) {
  fetchChapters(input: { mangaId: $mangaId }) {
    chapters {
      id
      name
      chapterNumber
      scanlator
      uploadDate
      url
      realUrl
    }
  }
}
`

export const FETCH_CHAPTER_PAGES_MUTATION = `
mutation FetchChapterPages($chapterId: Int!) {
  fetchChapterPages(input: { chapterId: $chapterId }) {
    pages
    chapter {
      id
      name
    }
  }
}
`

export const MANGA_BY_URL_QUERY = `
query MangaByUrl($sourceId: LongString!, $url: String!) {
  mangas(filter: {
    sourceId: { equalTo: $sourceId }
    url: { equalTo: $url }
  }) {
    nodes {
      id
      title
      url
    }
  }
}
`
