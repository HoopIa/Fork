import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Head from 'next/head'
import { ArrowLeft, Save, Edit2, X, Users, Ruler, Camera, Tag } from 'lucide-react'
import { Recipe } from '@/lib/github'
import { processIngredients } from '@/lib/ingredients'
import RecipeTimeline from '@/components/RecipeTimeline'
import { RECIPE_CATEGORIES } from '@/lib/categories'
import Modal from '@/components/Modal'
import Button from '@/components/Button'
import { RecipeDetailSkeleton } from '@/components/Skeleton'

export default function RecipePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { name } = router.query
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [history, setHistory] = useState<any[]>([])
  const [uploadingImage, setUploadingImage] = useState(false)
  const [servings, setServings] = useState(4)
  const [originalServings, setOriginalServings] = useState(4)
  const [useMetric, setUseMetric] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleValue, setTitleValue] = useState('')
  const [category, setCategory] = useState<string | null>(null)
  const [loadingCategory, setLoadingCategory] = useState(true)
  const [showCommitModal, setShowCommitModal] = useState(false)
  const [commitMessage, setCommitMessage] = useState('')
  const [heroImage, setHeroImage] = useState<string | null>(null)

  useEffect(() => {
    if (name && status === 'authenticated') {
      fetchRecipe()
      fetchHistory()
      fetchCategory()
    }
  }, [name, status])

  useEffect(() => {
    if (recipe) {
      setTitleValue(recipe.name)
    }
  }, [recipe])

  const fetchCategory = async () => {
    if (!name) return
    try {
      const res = await fetch(`/api/recipes/${encodeURIComponent(name as string)}/category`)
      if (res.ok) {
        const data = await res.json()
        setCategory(data.category || null)
      }
    } catch (error) {
      console.error('Error fetching category:', error)
    } finally {
      setLoadingCategory(false)
    }
  }

  const handleCategoryChange = async (newCategory: string) => {
    if (!name) return
    setCategory(newCategory)
    try {
      await fetch(`/api/recipes/${encodeURIComponent(name as string)}/category`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: newCategory }),
      })
    } catch (error) {
      console.error('Error updating category:', error)
    }
  }

  const fetchRecipe = async () => {
    if (!name) return
    try {
      const res = await fetch(`/api/recipes/${encodeURIComponent(name as string)}`)
      if (res.ok) {
        const data = await res.json()
        setRecipe(data.recipe)
        setHeroImage(data.heroImage || null)
        // Try to extract original servings from recipe name or set default
        setOriginalServings(4)
        setServings(4)
      }
    } catch (error) {
      console.error('Error fetching recipe:', error)
    } finally {
      setLoading(false)
    }
  }
  
  // Get processed ingredients based on servings and unit system
  const getDisplayIngredients = () => {
    if (!recipe || editing) {
      return recipe?.ingredients || []
    }
    return processIngredients(recipe.ingredients, servings, originalServings, useMetric)
  }

  const fetchHistory = async () => {
    if (!name) return
    try {
      const res = await fetch(`/api/recipes/${encodeURIComponent(name as string)}/history`)
      if (res.ok) {
        const data = await res.json()
        setHistory(data.history || [])
      }
    } catch (error) {
      console.error('Error fetching history:', error)
    }
  }

  const handleSaveClick = () => {
    // Show the commit message modal
    setCommitMessage('')
    setShowCommitModal(true)
  }

  const handleSave = async () => {
    if (!recipe || !name || !commitMessage.trim()) return

    setShowCommitModal(false)
    setSaving(true)
    try {
      const oldName = name as string
      const res = await fetch(`/api/recipes/${encodeURIComponent(oldName)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...recipe,
          oldName: oldName,
          commitMessage: commitMessage.trim(),
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setEditing(false)
        setEditingTitle(false)
        setCommitMessage('')
        
        // If name changed, redirect to new URL
        if (data.newName && data.newName !== oldName) {
          router.push(`/recipes/${encodeURIComponent(data.newName)}`)
        } else {
          await fetchRecipe()
          await fetchHistory()
        }
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to save recipe')
      }
    } catch (error) {
      console.error('Error saving recipe:', error)
      alert('Failed to save recipe')
    } finally {
      setSaving(false)
    }
  }

  const handleTitleSave = () => {
    if (!recipe) return
    if (titleValue.trim() && titleValue !== recipe.name) {
      setRecipe({ ...recipe, name: titleValue.trim() })
    }
    setEditingTitle(false)
  }

  const updateIngredient = (index: number, value: string) => {
    if (!recipe) return
    const newIngredients = [...recipe.ingredients]
    newIngredients[index] = value
    setRecipe({ ...recipe, ingredients: newIngredients })
  }

  const addIngredient = () => {
    if (!recipe) return
    setRecipe({ ...recipe, ingredients: [...recipe.ingredients, ''] })
  }

  const removeIngredient = (index: number) => {
    if (!recipe) return
    const newIngredients = recipe.ingredients.filter((_, i) => i !== index)
    setRecipe({ ...recipe, ingredients: newIngredients })
  }

  const updateInstruction = (index: number, value: string) => {
    if (!recipe) return
    const newInstructions = [...recipe.instructions]
    newInstructions[index] = value
    setRecipe({ ...recipe, instructions: newInstructions })
  }

  const addInstruction = () => {
    if (!recipe) return
    setRecipe({ ...recipe, instructions: [...recipe.instructions, ''] })
  }

  const removeInstruction = (index: number) => {
    if (!recipe) return
    const newInstructions = recipe.instructions.filter((_, i) => i !== index)
    setRecipe({ ...recipe, instructions: newInstructions })
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!recipe || !name || !e.target.files?.[0]) return
    
    const file = e.target.files[0]
    
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Image size must be less than 10MB')
      e.target.value = ''
      return
    }
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      e.target.value = ''
      return
    }
    
    const reader = new FileReader()
    
    reader.onloadend = async () => {
      const base64 = reader.result as string
      const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
      
      setUploadingImage(true)
      try {
        const res = await fetch(`/api/recipes/${encodeURIComponent(name as string)}/images`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64, filename }),
        })
        
        if (res.ok) {
          const data = await res.json()
          if (recipe.images) {
            setRecipe({ ...recipe, images: [...recipe.images, data.url] })
          } else {
            setRecipe({ ...recipe, images: [data.url] })
          }
          await fetchRecipe()
        } else {
          const error = await res.json()
          alert(error.error || 'Failed to upload image')
        }
      } catch (error) {
        console.error('Error uploading image:', error)
        alert('Failed to upload image')
      } finally {
        setUploadingImage(false)
        e.target.value = '' // Reset input
      }
    }
    
    reader.readAsDataURL(file)
  }

  const handleImageDelete = async (imageUrl: string) => {
    if (!recipe || !name) return
    
    // Extract filename from URL
    const urlParts = imageUrl.split('/')
    const filename = urlParts[urlParts.length - 1]
    
    try {
      const res = await fetch(`/api/recipes/${encodeURIComponent(name as string)}/images`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename }),
      })
      
      if (res.ok) {
        if (recipe.images) {
          setRecipe({ ...recipe, images: recipe.images.filter(img => img !== imageUrl) })
        }
        await fetchRecipe()
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to delete image')
      }
    } catch (error) {
      console.error('Error deleting image:', error)
      alert('Failed to delete image')
    }
  }

  if (status === 'loading' || loading) {
    return (
      <>
        <Head>
          <title>Loading... | Fork</title>
        </Head>
        <div className="min-h-screen bg-white">
          <nav className="bg-white border-b border-gray-100 h-20" />
          <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <RecipeDetailSkeleton />
          </main>
        </div>
      </>
    )
  }

  if (!session) {
    router.push('/')
    return null
  }

  if (!recipe) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Recipe not found</div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>{recipe.name} | Fork</title>
        <meta name="description" content={`Recipe for ${recipe.name}`} />
      </Head>

      {/* Commit Message Modal */}
      <Modal
        isOpen={showCommitModal}
        onClose={() => {
          setShowCommitModal(false)
          setCommitMessage('')
        }}
        title="Describe Your Changes"
        description="What did you change in this version? This will be saved in the recipe history."
      >
        <textarea
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
          placeholder="e.g., Added more garlic, reduced cooking time, substituted butter for oil..."
          className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900 focus:outline-none resize-none"
          rows={3}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.metaKey && commitMessage.trim()) {
              handleSave()
            }
          }}
        />
        <p className="text-xs text-gray-500 mt-2 mb-4">
          Press ⌘+Enter to save quickly
        </p>
        <div className="flex gap-3">
          <Button
            onClick={handleSave}
            disabled={!commitMessage.trim()}
            loading={saving}
            className="flex-1"
          >
            Save Changes
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setShowCommitModal(false)
              setCommitMessage('')
            }}
          >
            Cancel
          </Button>
        </div>
      </Modal>

      <div className="min-h-screen bg-white">
        <nav className="bg-white border-b border-gray-100 sticky top-0 z-10 backdrop-blur-sm bg-white/95">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-gray-600 hover:text-gray-900 transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              {editingTitle ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={titleValue}
                    onChange={(e) => setTitleValue(e.target.value)}
                    onBlur={handleTitleSave}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleTitleSave()
                      if (e.key === 'Escape') {
                        setEditingTitle(false)
                        setTitleValue(recipe?.name || '')
                      }
                    }}
                    className="text-2xl font-bold text-gray-900 px-2 py-1 border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:outline-none bg-white"
                    autoFocus
                  />
                </div>
              ) : (
                <h1 
                  className="text-2xl font-bold text-gray-900 cursor-pointer hover:text-gray-700 transition-colors tracking-tight"
                  onClick={() => editing && setEditingTitle(true)}
                  title={editing ? "Click to edit title" : ""}
                >
                  {recipe.name}
                </h1>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!editing ? (
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white hover:bg-gray-800 text-sm uppercase tracking-wide font-medium transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
              ) : (
                <button
                  onClick={handleSaveClick}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50 text-sm uppercase tracking-wide font-medium transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save'}
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Image */}
        {heroImage && (
          <div className="mb-6 -mx-4 sm:mx-0">
            <div className="aspect-[16/9] sm:aspect-[21/9] overflow-hidden sm:rounded-lg">
              <img
                src={heroImage}
                alt={recipe.name}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}

        <div className="bg-white border border-gray-100 p-8 sm:p-12">
          {/* Category */}
          <div className="mb-8 pb-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <Tag className="w-5 h-5 text-gray-400" />
              {editing ? (
                <select
                  value={category || ''}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="px-4 py-2 border border-gray-200 focus:ring-2 focus:ring-gray-900 focus:outline-none bg-white text-sm uppercase tracking-wide"
                >
                  <option value="">Select Category</option>
                  {RECIPE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              ) : (
                <span className="text-sm uppercase tracking-wide text-gray-600">
                  {category || 'Uncategorized'}
                </span>
              )}
            </div>
          </div>

          {recipe.images && recipe.images.length > 0 && (
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Images</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {recipe.images.map((imageUrl, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={imageUrl}
                      alt={`${recipe.name} ${index + 1}`}
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    {editing && (
                      <button
                        onClick={() => handleImageDelete(imageUrl)}
                        className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {editing && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Add Image</h2>
              <label className="flex flex-col sm:flex-row items-center justify-center gap-3 px-6 py-4 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-colors">
                <div className="flex items-center gap-2">
                  <Camera className="w-5 h-5 text-gray-600" />
                  <span className="text-gray-700 font-medium">
                    {uploadingImage ? 'Uploading...' : 'Choose Photo'}
                  </span>
                </div>
                <span className="text-sm text-gray-500">Tap to select from device</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                  className="hidden"
                />
              </label>
              <p className="text-xs text-gray-500 mt-2 text-center">
                Supports JPG, PNG, WebP. Max 10MB. Works on mobile and desktop.
              </p>
            </div>
          )}

          <div className="mb-12">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Ingredients</h2>
              {!editing && (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-gray-600" />
                    <label className="text-sm text-gray-700">Servings:</label>
                    <input
                      type="number"
                      min="1"
                      value={servings}
                      onChange={(e) => setServings(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-20 px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Ruler className="w-5 h-5 text-gray-600" />
                    <label className="text-sm text-gray-700">Units:</label>
                    <button
                      onClick={() => setUseMetric(!useMetric)}
                      className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                        useMetric
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {useMetric ? 'Metric' : 'Imperial'}
                    </button>
                  </div>
                </div>
              )}
            </div>
            {editing ? (
              <div className="space-y-2">
                {recipe.ingredients.map((ingredient, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={ingredient}
                      onChange={(e) => updateIngredient(index, e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    />
                    {recipe.ingredients.length > 1 && (
                      <button
                        onClick={() => removeIngredient(index)}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={addIngredient}
                  className="text-orange-600 hover:text-orange-700 font-medium"
                >
                  + Add Ingredient
                </button>
              </div>
            ) : (
              <ul className="list-none space-y-3">
                {getDisplayIngredients().map((ingredient, index) => (
                  <li key={index} className="text-gray-700 text-lg leading-relaxed pl-6 relative before:content-['•'] before:absolute before:left-0 before:text-gray-400">{ingredient}</li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-6 tracking-tight">Instructions</h2>
            {editing ? (
              <div className="space-y-2">
                {recipe.instructions.map((instruction, index) => (
                  <div key={index} className="flex gap-2">
                    <textarea
                      value={instruction}
                      onChange={(e) => updateInstruction(index, e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      rows={2}
                    />
                    {recipe.instructions.length > 1 && (
                      <button
                        onClick={() => removeInstruction(index)}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg self-start"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={addInstruction}
                  className="text-orange-600 hover:text-orange-700 font-medium"
                >
                  + Add Instruction
                </button>
              </div>
            ) : (
              <ol className="list-none space-y-4" style={{ counterReset: 'step-counter' }}>
                {recipe.instructions.map((instruction, index) => (
                  <li key={index} className="text-gray-700 text-lg leading-relaxed pl-8 relative" style={{ counterIncrement: 'step-counter' }}>
                    <span className="absolute left-0 font-bold text-gray-900">{index + 1}.</span>
                    <span className="pl-2">{instruction}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>

        {/* Recipe Evolution Timeline */}
        {history.length > 0 && (
          <div className="mt-8">
            <RecipeTimeline 
              history={history} 
              recipeName={name as string}
              onRatingUpdate={fetchHistory}
            />
          </div>
        )}
      </main>
      </div>
    </>
  )
}

