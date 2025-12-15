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
  category?: string
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
      
      // Get category
      try {
        const { getRecipeCategory } = await import('./categories')
        const category = await getRecipeCategory(octokit, username, recipeName, repoName)
        recipe.category = category || undefined
      } catch {
        // Category not available
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
  message: string = 'Update recipe',
  oldName?: string
): Promise<void> {
  const recipeText = formatRecipeToText(recipe)
  const recipePath = `${recipe.name}/${recipe.name}.txt`
  const oldPath = oldName ? `${oldName}/${oldName}.txt` : recipePath
  
  // If name changed, we need to move the file and directory
  if (oldName && oldName !== recipe.name) {
    // Get the old file content
    let oldSha: string | undefined
    try {
      const { data } = await octokit.repos.getContent({
        owner: username,
        repo: repoName,
        path: oldPath,
      })
      if ('sha' in data) {
        oldSha = data.sha
      }
    } catch {
      // Old file doesn't exist
    }
    
    // Create new file with new name
    await octokit.repos.createOrUpdateFileContents({
      owner: username,
      repo: repoName,
      path: recipePath,
      message: `Rename recipe from ${oldName} to ${recipe.name}`,
      content: Buffer.from(recipeText).toString('base64'),
    })
    
    // Move images if they exist
    try {
      const imagesData = await octokit.repos.getContent({
        owner: username,
        repo: repoName,
        path: `${oldName}/images`,
      })
      
      if (Array.isArray(imagesData.data)) {
        for (const image of imagesData.data) {
          if (image.type === 'file' && 'sha' in image) {
            // Get image content
            const imageContent = await octokit.repos.getContent({
              owner: username,
              repo: repoName,
              path: image.path,
            })
            
            if ('content' in imageContent.data && imageContent.data.content) {
              // Create in new location
              await octokit.repos.createOrUpdateFileContents({
                owner: username,
                repo: repoName,
                path: `${recipe.name}/images/${image.name}`,
                message: `Move image for renamed recipe`,
                content: imageContent.data.content,
              })
              
              // Delete old image
              await octokit.repos.deleteFile({
                owner: username,
                repo: repoName,
                path: image.path,
                message: `Remove image from old recipe location`,
                sha: image.sha,
              })
            }
          }
        }
      }
    } catch {
      // No images to move
    }
    
    // Delete old file
    if (oldSha) {
      await octokit.repos.deleteFile({
        owner: username,
        repo: repoName,
        path: oldPath,
        message: `Remove old recipe file after rename`,
        sha: oldSha,
      })
    }
  } else {
    // Normal update - get current SHA if file exists
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
      const recipe = parseRecipeFromText(text)
      
      // Try to get images for this version
      try {
        const imagesData = await octokit.repos.getContent({
          owner: username,
          repo: repoName,
          path: `${recipeName}/images`,
          ref: sha,
        })
        
        if (Array.isArray(imagesData.data)) {
          recipe.images = imagesData.data
            .filter((item: any) => item.type === 'file')
            .map((item: any) => item.download_url)
        }
      } catch {
        // No images for this version
      }
      
      return recipe
    }
    return null
  } catch (error) {
    return null
  }
}

// Get images for a specific version (or latest if sha not provided)
export async function getRecipeImagesForVersion(
  octokit: Octokit,
  username: string,
  recipeName: string,
  sha?: string,
  repoName: string = 'recipes'
): Promise<string[]> {
  try {
    const imagesData = await octokit.repos.getContent({
      owner: username,
      repo: repoName,
      path: `${recipeName}/images`,
      ...(sha ? { ref: sha } : {}),
    })
    
    if (Array.isArray(imagesData.data)) {
      return imagesData.data
        .filter((item: any) => item.type === 'file')
        .map((item: any) => item.download_url)
    }
    return []
  } catch {
    return []
  }
}

