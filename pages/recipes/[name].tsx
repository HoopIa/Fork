import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Save, History, Edit2, Upload, X } from 'lucide-react'
import { Recipe } from '@/lib/github'

export default function RecipePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { name } = router.query
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState<any[]>([])
  const [uploadingImage, setUploadingImage] = useState(false)

  useEffect(() => {
    if (name && status === 'authenticated') {
      fetchRecipe()
      fetchHistory()
    }
  }, [name, status])

  const fetchRecipe = async () => {
    if (!name) return
    try {
      const res = await fetch(`/api/recipes/${encodeURIComponent(name as string)}`)
      if (res.ok) {
        const data = await res.json()
        setRecipe(data.recipe)
      }
    } catch (error) {
      console.error('Error fetching recipe:', error)
    } finally {
      setLoading(false)
    }
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

  const handleSave = async () => {
    if (!recipe || !name) return

    setSaving(true)
    try {
      const res = await fetch(`/api/recipes/${encodeURIComponent(name as string)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...recipe,
          commitMessage: `Update ${recipe.name} recipe`,
        }),
      })

      if (res.ok) {
        setEditing(false)
        await fetchRecipe()
        await fetchHistory()
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
    const reader = new FileReader()
    
    reader.onloadend = async () => {
      const base64 = reader.result as string
      const filename = `${Date.now()}-${file.name}`
      
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
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
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
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-gray-600 hover:text-gray-800">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-xl font-bold text-gray-800">{recipe.name}</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100"
              >
                <History className="w-4 h-4" />
                History
              </button>
              {!editing ? (
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
              ) : (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save'}
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {showHistory && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Version History</h2>
            {history.length === 0 ? (
              <p className="text-gray-500">No history available</p>
            ) : (
              <div className="space-y-2">
                {history.map((commit) => (
                  <div key={commit.sha} className="border-b pb-2">
                    <p className="font-medium">{commit.message}</p>
                    <p className="text-sm text-gray-500">
                      {commit.author} • {new Date(commit.date).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6">
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
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Add Image</h2>
              <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 inline-block">
                <Upload className="w-5 h-5 text-gray-600" />
                <span className="text-gray-700">
                  {uploadingImage ? 'Uploading...' : 'Upload Image'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                  className="hidden"
                />
              </label>
            </div>
          )}

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Ingredients</h2>
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
              <ul className="list-disc list-inside space-y-1">
                {recipe.ingredients.map((ingredient, index) => (
                  <li key={index} className="text-gray-700">{ingredient}</li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Instructions</h2>
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
              <ol className="list-decimal list-inside space-y-2">
                {recipe.instructions.map((instruction, index) => (
                  <li key={index} className="text-gray-700">{instruction}</li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

