import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { getOctokit, saveRecipe, ensureRecipeRepo, Recipe, getRecipeHistory } from '@/lib/github'
import { saveVersionImage } from '@/lib/version-images'

// Fetch webpage content
async function fetchWebpage(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    })
    
    if (!response.ok) {
      throw new Error(`Failed to fetch webpage: ${response.statusText}`)
    }
    
    return await response.text()
  } catch (error: any) {
    throw new Error(`Error fetching webpage: ${error.message}`)
  }
}

// Decode HTML entities in a string
function decodeHtmlEntities(text: string): string {
  if (!text) return text
  
  // Decode in multiple passes to handle nested/encoded entities
  let decoded = text
  
  // First pass: Handle numeric and hex entities (must be done before named entities)
  decoded = decoded
    // Handle hex entities like &#x27; or &#x2019;
    .replace(/&#x([0-9a-fA-F]+);/gi, (match, hex) => {
      try {
        return String.fromCharCode(parseInt(hex, 16))
      } catch {
        return match
      }
    })
    // Handle numeric entities like &#39; or &#8217;
    .replace(/&#(\d+);/g, (match, dec) => {
      try {
        return String.fromCharCode(parseInt(dec, 10))
      } catch {
        return match
      }
    })
  
  // Second pass: Handle named entities (must be done after numeric to avoid conflicts)
  decoded = decoded
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&#x60;/g, '`')
    .replace(/&#x3D;/g, '=')
  
  return decoded.trim()
}

// Extract structured recipe data from JSON-LD (Schema.org Recipe)
function extractStructuredData(html: string): Recipe | null {
  try {
    // Look for JSON-LD script tags with Recipe schema
    const jsonLdMatch = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)
    
    if (jsonLdMatch) {
      for (const script of jsonLdMatch) {
        const content = script.replace(/<script[^>]*>([\s\S]*?)<\/script>/i, '$1')
        try {
          const data = JSON.parse(content)
          
          // Handle both single objects and arrays
          const recipes = Array.isArray(data) ? data : [data]
          
          for (const item of recipes) {
            // Check if it's a Recipe schema
            if (item['@type'] === 'Recipe' || 
                (Array.isArray(item['@type']) && item['@type'].includes('Recipe'))) {
              
              const recipe: Recipe = {
                name: decodeHtmlEntities(item.name || item.headline || 'Untitled Recipe'),
                ingredients: [],
                instructions: [],
              }
              
              // Extract ingredients
              if (item.recipeIngredient) {
                recipe.ingredients = Array.isArray(item.recipeIngredient)
                  ? item.recipeIngredient.map((ing: any) => {
                      const text = typeof ing === 'string' ? ing : ing.text || ing.name || String(ing)
                      return decodeHtmlEntities(text)
                    })
                  : [decodeHtmlEntities(String(item.recipeIngredient))]
              } else if (item.ingredients) {
                recipe.ingredients = Array.isArray(item.ingredients)
                  ? item.ingredients.map((ing: any) => {
                      const text = typeof ing === 'string' ? ing : ing.text || ing.name || String(ing)
                      return decodeHtmlEntities(text)
                    })
                  : [decodeHtmlEntities(String(item.ingredients))]
              }
              
              // Extract instructions
              if (item.recipeInstructions) {
                if (Array.isArray(item.recipeInstructions)) {
                  recipe.instructions = item.recipeInstructions.map((inst: any) => {
                    let text: string
                    if (typeof inst === 'string') {
                      text = inst
                    } else if (inst['@type'] === 'HowToStep' || inst.itemListElement) {
                      text = inst.text || inst.name || String(inst)
                    } else {
                      text = String(inst)
                    }
                    return decodeHtmlEntities(text)
                  })
                } else {
                  recipe.instructions = [decodeHtmlEntities(String(item.recipeInstructions))]
                }
              } else if (item.instructions) {
                recipe.instructions = Array.isArray(item.instructions)
                  ? item.instructions.map((inst: any) => {
                      const text = typeof inst === 'string' ? inst : inst.text || inst.name || String(inst)
                      return decodeHtmlEntities(text)
                    })
                  : [decodeHtmlEntities(String(item.instructions))]
              }
              
              // Validate we got meaningful data
              if (recipe.ingredients.length > 0 && recipe.instructions.length > 0) {
                return recipe
              }
            }
          }
        } catch (e) {
          // Continue to next script tag
          continue
        }
      }
    }
  } catch (error) {
    // Fall through to other methods
  }
  
  return null
}

// Parse recipe from common HTML patterns
function parseHTMLRecipe(html: string): Recipe | null {
  try {
    // Common selectors used by recipe sites
    const patterns = {
      name: [
        /<h1[^>]*class=["'][^"']*recipe[^"']*title[^"']*["'][^>]*>([^<]+)<\/h1>/i,
        /<h1[^>]*class=["'][^"']*title[^"']*["'][^>]*>([^<]+)<\/h1>/i,
        /<h1[^>]*>([^<]+)<\/h1>/i,
      ],
      ingredients: [
        /<[^>]*class=["'][^"']*ingredient[^"']*["'][^>]*>([^<]+)<\/[^>]+>/gi,
        /<li[^>]*class=["'][^"']*ingredient[^"']*["'][^>]*>([^<]+)<\/li>/gi,
        /<div[^>]*class=["'][^"']*ingredient[^"']*["'][^>]*>([^<]+)<\/div>/gi,
      ],
      instructions: [
        /<[^>]*class=["'][^"']*instruction[^"']*["'][^>]*>([^<]+)<\/[^>]+>/gi,
        /<li[^>]*class=["'][^"']*instruction[^"']*["'][^>]*>([^<]+)<\/li>/gi,
        /<div[^>]*class=["'][^"']*instruction[^"']*["'][^>]*>([^<]+)<\/div>/gi,
        /<p[^>]*class=["'][^"']*step[^"']*["'][^>]*>([^<]+)<\/p>/gi,
      ],
    }
    
    const recipe: Recipe = {
      name: '',
      ingredients: [],
      instructions: [],
    }
    
    // Extract name
    for (const pattern of patterns.name) {
      const match = html.match(pattern)
      if (match && match[1]) {
        recipe.name = decodeHtmlEntities(match[1].trim())
        break
      }
    }
    
    // Extract ingredients
    for (const pattern of patterns.ingredients) {
      const matches = Array.from(html.matchAll(pattern))
      for (const match of matches) {
        if (match[1]) {
          const text = match[1].trim()
          // Clean up HTML entities and extra whitespace
          const clean = decodeHtmlEntities(text).replace(/\s+/g, ' ').trim()
          if (clean && clean.length > 2) {
            recipe.ingredients.push(clean)
          }
        }
      }
      if (recipe.ingredients.length > 0) break
    }
    
    // Extract instructions
    for (const pattern of patterns.instructions) {
      const matches = Array.from(html.matchAll(pattern))
      for (const match of matches) {
        if (match[1]) {
          const text = match[1].trim()
          const clean = decodeHtmlEntities(text).replace(/\s+/g, ' ').trim()
          if (clean && clean.length > 5) {
            recipe.instructions.push(clean)
          }
        }
      }
      if (recipe.instructions.length > 0) break
    }
    
    // Validate we got meaningful data
    if (recipe.name && recipe.ingredients.length > 0 && recipe.instructions.length > 0) {
      return recipe
    }
    
    return null
  } catch (error) {
    return null
  }
}

// Extract recipe image from JSON-LD or HTML
function extractRecipeImage(html: string): string | null {
  try {
    // First try JSON-LD
    const jsonLdMatch = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)
    
    if (jsonLdMatch) {
      for (const script of jsonLdMatch) {
        const content = script.replace(/<script[^>]*>([\s\S]*?)<\/script>/i, '$1')
        try {
          const data = JSON.parse(content)
          const recipes = Array.isArray(data) ? data : [data]
          
          for (const item of recipes) {
            if (item['@type'] === 'Recipe' || 
                (Array.isArray(item['@type']) && item['@type'].includes('Recipe'))) {
              // Check for image in various formats
              if (item.image) {
                if (typeof item.image === 'string') {
                  return item.image
                }
                if (Array.isArray(item.image) && item.image.length > 0) {
                  const firstImage = item.image[0]
                  if (typeof firstImage === 'string') return firstImage
                  if (firstImage.url) return firstImage.url
                }
                if (item.image.url) return item.image.url
              }
            }
          }
        } catch {
          continue
        }
      }
    }
    
    // Try Open Graph image
    const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)
    if (ogImageMatch && ogImageMatch[1]) {
      return ogImageMatch[1]
    }
    
    // Try twitter image
    const twitterImageMatch = html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i)
    if (twitterImageMatch && twitterImageMatch[1]) {
      return twitterImageMatch[1]
    }
    
    // Try first large image in recipe content area
    const recipeImageMatch = html.match(/<img[^>]*class=["'][^"']*recipe[^"']*["'][^>]*src=["']([^"']+)["']/i)
    if (recipeImageMatch && recipeImageMatch[1]) {
      return recipeImageMatch[1]
    }
  } catch (error) {
    console.error('Error extracting image:', error)
  }
  
  return null
}

// Fetch image and convert to base64
async function fetchImageAsBase64(imageUrl: string): Promise<string | null> {
  try {
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    })
    
    if (!response.ok) return null
    
    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.startsWith('image/')) return null
    
    const arrayBuffer = await response.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')
    return `data:${contentType};base64,${base64}`
  } catch (error) {
    console.error('Error fetching image:', error)
    return null
  }
}

// Extract text content from HTML (for LLM fallback)
function extractTextFromHTML(html: string): string {
  // Remove script and style tags
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
  
  // Remove HTML tags but keep text content
  text = text.replace(/<[^>]+>/g, ' ')
  
  // Decode HTML entities
  text = decodeHtmlEntities(text)
  
  // Clean up whitespace
  text = text.replace(/\s+/g, ' ').trim()
  
  return text.substring(0, 10000) // Limit to 10k characters
}

// Use LLM to convert webpage content to recipe format
async function convertToRecipe(content: string, url: string): Promise<Recipe> {
  const apiKey = process.env.OPENAI_API_KEY
  
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured. Please add it to your .env.local file.')
  }
  
  const prompt = `Convert the following recipe content from a webpage into a structured recipe format. Extract the recipe name, ingredients, and instructions.

Webpage content:
${content}

Please format the response as JSON with this structure:
{
  "name": "Recipe Name",
  "ingredients": ["ingredient 1", "ingredient 2", ...],
  "instructions": ["instruction 1", "instruction 2", ...]
}

Only return the JSON, no other text.`

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that extracts recipe information from web content and formats it as JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`)
    }
    
    const data = await response.json()
    const content = data.choices[0]?.message?.content
    
    if (!content) {
      throw new Error('No response from OpenAI API')
    }
    
    // Extract JSON from response (handle cases where LLM adds markdown formatting)
    let jsonStr = content.trim()
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '')
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/```\n?/g, '')
    }
    
    const recipe = JSON.parse(jsonStr)
    
    // Validate recipe structure
    if (!recipe.name || !Array.isArray(recipe.ingredients) || !Array.isArray(recipe.instructions)) {
      throw new Error('Invalid recipe format from LLM')
    }
    
    return {
      name: recipe.name.trim(),
      ingredients: recipe.ingredients.filter((i: string) => i.trim()).map((i: string) => i.trim()),
      instructions: recipe.instructions.filter((i: string) => i.trim()).map((i: string) => i.trim()),
    }
  } catch (error: any) {
    if (error.message.includes('JSON')) {
      throw new Error(`Failed to parse recipe: ${error.message}`)
    }
    throw error
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  
  const session = await getServerSession(req, res, authOptions)
  
  if (!session || !session.accessToken) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  
  const { url } = req.body
  
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL is required' })
  }
  
  // Validate URL
  try {
    new URL(url)
  } catch {
    return res.status(400).json({ error: 'Invalid URL format' })
  }
  
  try {
    const octokit = getOctokit(session.accessToken)
    const username = session.githubUsername || session.user?.name || 'user'
    const repoName = process.env.GITHUB_REPO_NAME || 'recipes'
    
    // Ensure repository exists
    await ensureRecipeRepo(octokit, username, repoName)
    
    // Fetch webpage
    const html = await fetchWebpage(url)
    
    // Try multiple extraction methods in order of preference
    let recipe: Recipe | null = null
    
    // Method 1: Try structured data (JSON-LD Schema.org Recipe) - fastest and most reliable
    recipe = extractStructuredData(html)
    
    // Method 2: Try HTML pattern matching
    if (!recipe) {
      recipe = parseHTMLRecipe(html)
    }
    
    // Method 3: Fall back to LLM if structured data and HTML parsing failed
    if (!recipe) {
      const textContent = extractTextFromHTML(html)
      
      if (!textContent || textContent.length < 100) {
        return res.status(400).json({ 
          error: 'Could not extract recipe from webpage. The page may not contain a recipe or use an unsupported format.' 
        })
      }
      
      // Use LLM as last resort
      recipe = await convertToRecipe(textContent, url)
    }
    
    // Ensure all HTML entities are decoded before saving
    if (recipe) {
      recipe.name = decodeHtmlEntities(recipe.name)
      recipe.ingredients = recipe.ingredients.map(ing => decodeHtmlEntities(ing))
      recipe.instructions = recipe.instructions.map(inst => decodeHtmlEntities(inst))
    }
    
    // Extract image from the source page
    const imageUrl = extractRecipeImage(html)
    let savedImage: string | null = null
    
    // Save recipe to GitHub
    await saveRecipe(
      octokit,
      username,
      recipe!,
      repoName,
      `Import recipe from ${url}`
    )
    
    // If we found an image, try to save it as the v1 image
    if (imageUrl) {
      try {
        // Fetch the image and convert to base64
        const base64Image = await fetchImageAsBase64(imageUrl)
        
        if (base64Image) {
          // Wait a moment for GitHub to propagate the commit
          await new Promise(resolve => setTimeout(resolve, 1000))
          
          // Get the commit SHA for v1
          const history = await getRecipeHistory(octokit, username, recipe!.name, repoName)
          
          if (history.length > 0) {
            const v1Sha = history[0].sha // Most recent commit (which is v1 for a new recipe)
            console.log('Saving imported image for v1, sha:', v1Sha, 'recipe:', recipe!.name)
            
            // Determine filename from URL or use default
            const urlPath = new URL(imageUrl).pathname
            const ext = urlPath.split('.').pop()?.toLowerCase() || 'jpg'
            const filename = `imported.${ext}`
            
            // Upload the image
            const imagePath = `${recipe!.name}/version-images/v1-${filename}`
            const base64Data = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image
            
            await octokit.repos.createOrUpdateFileContents({
              owner: username,
              repo: repoName,
              path: imagePath,
              message: `Add imported image for ${recipe!.name}`,
              content: base64Data,
            })
            
            // Get the download URL
            const { data } = await octokit.repos.getContent({
              owner: username,
              repo: repoName,
              path: imagePath,
            })
            
            const downloadUrl = 'download_url' in data ? data.download_url || '' : ''
            
            // Save the version image metadata
            await saveVersionImage(octokit, username, recipe!.name, v1Sha, 1, imagePath, downloadUrl, repoName)
            
            savedImage = downloadUrl
          }
        }
      } catch (imageError) {
        // Log but don't fail the import if image saving fails
        console.error('Error saving imported image:', imageError)
      }
    }
    
    return res.status(200).json({
      success: true,
      recipe,
      image: savedImage,
      message: `Recipe "${recipe!.name}" imported successfully`,
    })
  } catch (error: any) {
    console.error('Error importing recipe:', error)
    return res.status(500).json({
      error: error.message || 'Failed to import recipe',
    })
  }
}

