import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { useState } from 'react'
import Link from 'next/link'
import Head from 'next/head'
import { ArrowLeft, Save, Tag, Plus, Minus } from 'lucide-react'
import { RECIPE_CATEGORIES } from '@/lib/categories'
import Button from '@/components/Button'

export default function NewRecipe() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [category, setCategory] = useState('')
  const [recipe, setRecipe] = useState({
    name: '',
    ingredients: [''],
    instructions: [''],
  })

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  if (!session) {
    router.push('/')
    return null
  }

  const addIngredient = () => {
    setRecipe({
      ...recipe,
      ingredients: [...recipe.ingredients, ''],
    })
  }

  const updateIngredient = (index: number, value: string) => {
    const newIngredients = [...recipe.ingredients]
    newIngredients[index] = value
    setRecipe({ ...recipe, ingredients: newIngredients })
  }

  const removeIngredient = (index: number) => {
    const newIngredients = recipe.ingredients.filter((_, i) => i !== index)
    setRecipe({ ...recipe, ingredients: newIngredients })
  }

  const addInstruction = () => {
    setRecipe({
      ...recipe,
      instructions: [...recipe.instructions, ''],
    })
  }

  const updateInstruction = (index: number, value: string) => {
    const newInstructions = [...recipe.instructions]
    newInstructions[index] = value
    setRecipe({ ...recipe, instructions: newInstructions })
  }

  const removeInstruction = (index: number) => {
    const newInstructions = recipe.instructions.filter((_, i) => i !== index)
    setRecipe({ ...recipe, instructions: newInstructions })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!recipe.name.trim()) {
      alert('Please enter a recipe name')
      return
    }

    const filteredIngredients = recipe.ingredients.filter(i => i.trim())
    const filteredInstructions = recipe.instructions.filter(i => i.trim())

    if (filteredIngredients.length === 0 || filteredInstructions.length === 0) {
      alert('Please add at least one ingredient and one instruction')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/recipes/${encodeURIComponent(recipe.name)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: recipe.name,
          ingredients: filteredIngredients,
          instructions: filteredInstructions,
          commitMessage: `Create ${recipe.name} recipe`,
        }),
      })

      if (res.ok) {
        // Save category if selected
        if (category) {
          try {
            await fetch(`/api/recipes/${encodeURIComponent(recipe.name)}/category`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ category }),
            })
          } catch (error) {
            console.error('Error saving category:', error)
            // Continue even if category save fails
          }
        }
        router.push(`/recipes/${encodeURIComponent(recipe.name)}`)
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to create recipe')
      }
    } catch (error) {
      console.error('Error creating recipe:', error)
      alert('Failed to create recipe')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Head>
        <title>New Recipe | Fork</title>
        <meta name="description" content="Create a new recipe" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      </Head>
      
      <div className="min-h-screen bg-white">
        <nav className="bg-white border-b border-gray-100 sticky top-0 z-10 backdrop-blur-sm bg-white/95">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center h-20 gap-4">
              <Link
                href="/"
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">New Recipe</h1>
            </div>
          </div>
        </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="bg-white border border-gray-100 p-8 sm:p-12">
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-900 mb-3 uppercase tracking-wide">
              Recipe Name
            </label>
            <input
              type="text"
              value={recipe.name}
              onChange={(e) => setRecipe({ ...recipe, name: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white text-lg"
              placeholder="e.g., Chocolate Cake"
              required
            />
          </div>

          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-900 mb-3 uppercase tracking-wide flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white text-sm uppercase tracking-wide"
            >
              <option value="">Select Category (Optional)</option>
              {RECIPE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-900 mb-3 uppercase tracking-wide">
              Ingredients
            </label>
            {recipe.ingredients.map((ingredient, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={ingredient}
                  onChange={(e) => updateIngredient(index, e.target.value)}
                  className="flex-1 px-4 py-3 border border-gray-200 focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white"
                  placeholder="e.g., 2 cups flour"
                />
                {recipe.ingredients.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeIngredient(index)}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addIngredient}
              className="mt-2 text-orange-600 hover:text-orange-700 font-medium"
            >
              + Add Ingredient
            </button>
          </div>

          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-900 mb-3 uppercase tracking-wide">
              Instructions
            </label>
            {recipe.instructions.map((instruction, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <textarea
                  value={instruction}
                  onChange={(e) => updateInstruction(index, e.target.value)}
                  className="flex-1 px-4 py-3 border border-gray-200 focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white"
                  placeholder="e.g., Mix dry ingredients in a large bowl"
                  rows={3}
                />
                {recipe.instructions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeInstruction(index)}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg self-start"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addInstruction}
              className="mt-2 text-orange-600 hover:text-orange-700 font-medium"
            >
              + Add Instruction
            </button>
          </div>

          <div className="flex gap-4">
            <Button
              type="submit"
              loading={loading}
              icon={<Save className="w-4 h-4" />}
              size="lg"
            >
              {loading ? 'Creating...' : 'Create Recipe'}
            </Button>
            <Link href="/">
              <Button variant="secondary" size="lg">
                Cancel
              </Button>
            </Link>
          </div>
        </form>
      </main>
      </div>
    </>
  )
}

