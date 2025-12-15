import { Octokit } from '@octokit/rest'

export interface RecipeRating {
  sha: string
  rating: number
  version: number
  date: string
}

// Store ratings in a JSON file in the recipe directory
export async function saveRating(
  octokit: Octokit,
  username: string,
  recipeName: string,
  sha: string,
  rating: number,
  version: number,
  repoName: string = 'recipes'
): Promise<void> {
  const ratingsPath = `${recipeName}/.ratings.json`
  
  // Get existing ratings
  let existingRatings: RecipeRating[] = []
  try {
    const { data } = await octokit.repos.getContent({
      owner: username,
      repo: repoName,
      path: ratingsPath,
    })
    
    if ('content' in data && data.content) {
      const content = Buffer.from(data.content, 'base64').toString('utf-8')
      existingRatings = JSON.parse(content)
    }
  } catch {
    // Ratings file doesn't exist yet
  }
  
  // Update or add rating
  const existingIndex = existingRatings.findIndex(r => r.sha === sha)
  const newRating: RecipeRating = {
    sha,
    rating,
    version,
    date: new Date().toISOString(),
  }
  
  if (existingIndex >= 0) {
    existingRatings[existingIndex] = newRating
  } else {
    existingRatings.push(newRating)
  }
  
  // Sort by version number
  existingRatings.sort((a, b) => b.version - a.version)
  
  // Get SHA if file exists
  let sha_file: string | undefined
  try {
    const { data } = await octokit.repos.getContent({
      owner: username,
      repo: repoName,
      path: ratingsPath,
    })
    if ('sha' in data) {
      sha_file = data.sha
    }
  } catch {
    // File doesn't exist
  }
  
  // Save ratings
  await octokit.repos.createOrUpdateFileContents({
    owner: username,
    repo: repoName,
    path: ratingsPath,
    message: `Update rating for version ${version}`,
    content: Buffer.from(JSON.stringify(existingRatings, null, 2)).toString('base64'),
    sha: sha_file,
  })
}

export async function getRatings(
  octokit: Octokit,
  username: string,
  recipeName: string,
  repoName: string = 'recipes'
): Promise<RecipeRating[]> {
  try {
    const { data } = await octokit.repos.getContent({
      owner: username,
      repo: repoName,
      path: `${recipeName}/.ratings.json`,
    })
    
    if ('content' in data && data.content) {
      const content = Buffer.from(data.content, 'base64').toString('utf-8')
      return JSON.parse(content)
    }
  } catch {
    // Ratings file doesn't exist
  }
  
  return []
}

