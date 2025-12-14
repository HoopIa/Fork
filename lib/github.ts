import { Octokit } from '@octokit/rest'

export function getOctokit(accessToken: string) {
  return new Octokit({
    auth: accessToken,
  })
}

export interface Recipe {
  name: string
  ingredients: string[]
  instructions: string[]
  images?: string[]
}

export function formatRecipeToText(recipe: Recipe): string {
  let text = `Recipe: ${recipe.name}\n\n`
  
  text += 'Ingredients:\n'
  recipe.ingredients.forEach(ingredient => {
    text += `- ${ingredient}\n`
  })
  
  text += '\nInstructions:\n'
  recipe.instructions.forEach(instruction => {
    text += `- ${instruction}\n`
  })
  
  return text
}

export function parseRecipeFromText(text: string): Recipe {
  const lines = text.split('\n')
  const recipe: Recipe = {
    name: '',
    ingredients: [],
    instructions: [],
  }
  
  let currentSection: 'name' | 'ingredients' | 'instructions' = 'name'
  
  for (const line of lines) {
    if (line.startsWith('Recipe: ')) {
      recipe.name = line.replace('Recipe: ', '').trim()
      currentSection = 'ingredients'
    } else if (line === 'Ingredients:') {
      currentSection = 'ingredients'
    } else if (line === 'Instructions:') {
      currentSection = 'instructions'
    } else if (line.startsWith('- ')) {
      const content = line.substring(2).trim()
      if (currentSection === 'ingredients') {
        recipe.ingredients.push(content)
      } else if (currentSection === 'instructions') {
        recipe.instructions.push(content)
      }
    }
  }
  
  return recipe
}

export async function ensureRecipeRepo(octokit: Octokit, username: string, repoName: string = 'recipes') {
  try {
    await octokit.repos.get({ owner: username, repo: repoName })
  } catch (error: any) {
    if (error.status === 404) {
      // Repository doesn't exist, create it
      await octokit.repos.createForAuthenticatedUser({
        name: repoName,
        private: true,
        auto_init: true,
        description: 'My recipe collection',
      })
    } else {
      throw error
    }
  }
}

export async function getRecipeList(octokit: Octokit, username: string, repoName: string = 'recipes'): Promise<string[]> {
  try {
    const { data } = await octokit.repos.getContent({
      owner: username,
      repo: repoName,
      path: '',
    })
    
    if (Array.isArray(data)) {
      return data
        .filter(item => item.type === 'dir' && item.name !== '.git')
        .map(item => item.name)
    }
    return []
  } catch (error) {
    return []
  }
}

export async function getRecipe(octokit: Octokit, username: string, recipeName: string, repoName: string = 'recipes'): Promise<Recipe | null> {
  try {
    const { data } = await octokit.repos.getContent({
      owner: username,
      repo: repoName,
      path: `${recipeName}/${recipeName}.txt`,
    })
    
    if ('content' in data && data.content) {
      const text = Buffer.from(data.content, 'base64').toString('utf-8')
      const recipe = parseRecipeFromText(text)
      
      // Get images
      try {
        const imagesData = await octokit.repos.getContent({
          owner: username,
          repo: repoName,
          path: `${recipeName}/images`,
        })
        
        if (Array.isArray(imagesData.data)) {
          recipe.images = imagesData.data
            .filter((item: any) => item.type === 'file')
            .map((item: any) => item.download_url)
        }
      } catch {
        // No images folder
      }
      
      return recipe
    }
    return null
  } catch (error) {
    return null
  }
}

export async function saveRecipe(
  octokit: Octokit,
  username: string,
  recipe: Recipe,
  repoName: string = 'recipes',
  message: string = 'Update recipe'
): Promise<void> {
  const recipeText = formatRecipeToText(recipe)
  const recipePath = `${recipe.name}/${recipe.name}.txt`
  
  // Get current SHA if file exists
  let sha: string | undefined
  try {
    const { data } = await octokit.repos.getContent({
      owner: username,
      repo: repoName,
      path: recipePath,
    })
    if ('sha' in data) {
      sha = data.sha
    }
  } catch {
    // File doesn't exist, will create new
  }
  
  // Save recipe file
  await octokit.repos.createOrUpdateFileContents({
    owner: username,
    repo: repoName,
    path: recipePath,
    message: message,
    content: Buffer.from(recipeText).toString('base64'),
    sha: sha,
  })
}

export async function getRecipeHistory(
  octokit: Octokit,
  username: string,
  recipeName: string,
  repoName: string = 'recipes'
): Promise<any[]> {
  try {
    const { data } = await octokit.repos.listCommits({
      owner: username,
      repo: repoName,
      path: `${recipeName}/${recipeName}.txt`,
      per_page: 20,
    })
    
    return data.map(commit => ({
      sha: commit.sha,
      message: commit.commit.message,
      date: commit.commit.author?.date,
      author: commit.commit.author?.name,
    }))
  } catch (error) {
    return []
  }
}

export async function getRecipeVersion(
  octokit: Octokit,
  username: string,
  recipeName: string,
  sha: string,
  repoName: string = 'recipes'
): Promise<Recipe | null> {
  try {
    const { data } = await octokit.repos.getContent({
      owner: username,
      repo: repoName,
      path: `${recipeName}/${recipeName}.txt`,
      ref: sha,
    })
    
    if ('content' in data && data.content) {
      const text = Buffer.from(data.content, 'base64').toString('utf-8')
      return parseRecipeFromText(text)
    }
    return null
  } catch (error) {
    return null
  }
}

