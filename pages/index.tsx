import { useSession, signIn, signOut } from 'next-auth/react'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Head from 'next/head'
import { BookOpen, Plus, LogOut, LogIn, Download, Search, Trash2, MoreVertical } from 'lucide-react'
import Modal from '@/components/Modal'
import Button from '@/components/Button'
import { RecipeCardSkeleton } from '@/components/Skeleton'

interface Recipe {
  name: string
  category: string | null
  thumbnail: string | null
}

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [showImport, setShowImport] = useState(false)
  const [importUrl, setImportUrl] = useState('')
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteRecipe, setDeleteRecipe] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (status === 'authenticated' && session) {
      fetchRecipes()
    } else {
      setLoading(false)
    }
  }, [status, session])

  const fetchRecipes = async () => {
    try {
      const res = await fetch('/api/recipes')
      if (res.ok) {
        const data = await res.json()
        setRecipes(data.recipes || [])
      }
    } catch (error) {
      console.error('Error fetching recipes:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!importUrl.trim()) {
      setImportError('Please enter a URL')
      return
    }
    
    setImporting(true)
    setImportError(null)
    
    try {
      const res = await fetch('/api/recipes/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: importUrl.trim() }),
      })
      
      const data = await res.json()
      
      if (res.ok) {
        setShowImport(false)
        setImportUrl('')
        await fetchRecipes()
        router.push(`/recipes/${encodeURIComponent(data.recipe.name)}`)
      } else {
        setImportError(data.error || 'Failed to import recipe')
      }
    } catch (error: any) {
      setImportError(error.message || 'Failed to import recipe')
    } finally {
      setImporting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteRecipe) return
    
    setDeleting(true)
    try {
      const res = await fetch(`/api/recipes/${encodeURIComponent(deleteRecipe)}`, {
        method: 'DELETE',
      })
      
      if (res.ok) {
        setDeleteRecipe(null)
        await fetchRecipes()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to delete recipe')
      }
    } catch (error) {
      console.error('Error deleting recipe:', error)
      alert('Failed to delete recipe')
    } finally {
      setDeleting(false)
    }
  }

  // Filter recipes based on search
  const filteredRecipes = recipes.filter(recipe =>
    recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (recipe.category?.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  // Group recipes by category
  const groupedRecipes = filteredRecipes.reduce((acc, recipe) => {
    const category = recipe.category || 'Uncategorized'
    if (!acc[category]) acc[category] = []
    acc[category].push(recipe)
    return acc
  }, {} as Record<string, Recipe[]>)

  // Sort categories (Uncategorized last)
  const sortedCategories = Object.keys(groupedRecipes).sort((a, b) => {
    if (a === 'Uncategorized') return 1
    if (b === 'Uncategorized') return -1
    return a.localeCompare(b)
  })

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    )
  }

  if (!session) {
    return (
      <>
        <Head>
          <title>Fork - Recipe Version Control</title>
          <meta name="description" content="Track your cooking recipes as they evolve over time" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <meta name="theme-color" content="#111827" />
          <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        </Head>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-white">
          <div className="max-w-md w-full bg-white border border-gray-200 shadow-sm p-12 mx-4">
            <div className="text-center mb-10">
              <h1 className="text-5xl font-bold text-gray-900 mb-4 tracking-tight">Fork</h1>
              <p className="text-gray-600 text-lg leading-relaxed">
                Track your cooking recipes as they evolve over time
              </p>
            </div>
            
            <Button
              onClick={() => signIn('github', { callbackUrl: '/' })}
              icon={<LogIn className="w-4 h-4" />}
              size="lg"
              className="w-full"
            >
              Sign in with GitHub
            </Button>
            
            <p className="text-xs text-gray-500 mt-6 text-center uppercase tracking-wide">
              Your recipes will be stored in a private GitHub repository
            </p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Head>
        <title>My Recipe Book | Fork</title>
        <meta name="description" content="Your personal recipe collection with version history" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-white">
        <nav className="bg-white border-b border-gray-100 sticky top-0 z-10 backdrop-blur-sm bg-white/95">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-20">
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Fork</h1>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600 font-medium hidden sm:block">
                  {session.user?.name || session.user?.email}
                </span>
                <button
                  onClick={() => signOut()}
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Sign out</span>
                </button>
              </div>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8 flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <h2 className="text-4xl font-bold text-gray-900 tracking-tight">My Recipe Book</h2>
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => setShowImport(true)}
                  icon={<Download className="w-4 h-4" />}
                  variant="secondary"
                >
                  Import from URL
                </Button>
                <Link href="/recipes/new">
                  <Button icon={<Plus className="w-4 h-4" />}>
                    New Recipe
                  </Button>
                </Link>
              </div>
            </div>

            {/* Search */}
            {recipes.length > 0 && (
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search recipes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white"
                />
              </div>
            )}
          </div>

          {/* Import Modal */}
          <Modal
            isOpen={showImport}
            onClose={() => {
              setShowImport(false)
              setImportUrl('')
              setImportError(null)
            }}
            title="Import Recipe from URL"
            description="Paste a link to any recipe webpage"
          >
            <form onSubmit={handleImport}>
              <input
                type="url"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                placeholder="https://example.com/recipe"
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent mb-3"
                disabled={importing}
                autoFocus
              />
              <p className="text-xs text-gray-500 mb-4">
                We'll extract the recipe automatically using AI if needed.
              </p>
              
              {importError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {importError}
                </div>
              )}
              
              <div className="flex gap-3">
                <Button
                  type="submit"
                  loading={importing}
                  disabled={!importUrl.trim()}
                  className="flex-1"
                >
                  {importing ? 'Importing...' : 'Import Recipe'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowImport(false)
                    setImportUrl('')
                    setImportError(null)
                  }}
                  disabled={importing}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Modal>

          {/* Delete Confirmation Modal */}
          <Modal
            isOpen={!!deleteRecipe}
            onClose={() => setDeleteRecipe(null)}
            title="Delete Recipe"
            description="This action cannot be undone."
            size="sm"
          >
            <p className="text-gray-700 mb-6">
              Are you sure you want to delete <strong>{deleteRecipe}</strong>? This will permanently remove the recipe and all its history from GitHub.
            </p>
            <div className="flex gap-3">
              <Button
                onClick={handleDelete}
                loading={deleting}
                variant="danger"
                className="flex-1"
              >
                Delete
              </Button>
              <Button
                variant="secondary"
                onClick={() => setDeleteRecipe(null)}
                disabled={deleting}
              >
                Cancel
              </Button>
            </div>
          </Modal>

          {/* Loading State */}
          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <RecipeCardSkeleton key={i} />
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && recipes.length === 0 && (
            <div className="bg-white border border-gray-100 p-16 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <BookOpen className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">No recipes yet</h3>
              <p className="text-gray-600 mb-8 text-lg max-w-md mx-auto">
                Start building your recipe collection. Import from the web or create your own.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Button
                  onClick={() => setShowImport(true)}
                  icon={<Download className="w-4 h-4" />}
                  variant="secondary"
                  size="lg"
                >
                  Import from URL
                </Button>
                <Link href="/recipes/new">
                  <Button icon={<Plus className="w-4 h-4" />} size="lg">
                    Create Recipe
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* No Results */}
          {!loading && recipes.length > 0 && filteredRecipes.length === 0 && (
            <div className="bg-white border border-gray-100 p-12 text-center">
              <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">No recipes found</h3>
              <p className="text-gray-600">
                No recipes match "{searchQuery}". Try a different search term.
              </p>
            </div>
          )}

          {/* Recipe Grid */}
          {!loading && filteredRecipes.length > 0 && (
            <div className="space-y-12">
              {sortedCategories.map((category) => (
                <div key={category}>
                  <h3 className="text-2xl font-bold text-gray-900 mb-6 tracking-tight border-b border-gray-200 pb-2">
                    {category}
                    <span className="text-sm font-normal text-gray-500 ml-3">
                      {groupedRecipes[category].length} recipe{groupedRecipes[category].length !== 1 ? 's' : ''}
                    </span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {groupedRecipes[category].map((recipe) => (
                      <div
                        key={recipe.name}
                        className="bg-white border border-gray-100 hover:border-gray-300 transition-all group relative"
                      >
                        {/* Thumbnail */}
                        <Link href={`/recipes/${encodeURIComponent(recipe.name)}`}>
                          <div className="aspect-[4/3] bg-gray-100 overflow-hidden">
                            {recipe.thumbnail ? (
                              <img
                                src={recipe.thumbnail}
                                alt={recipe.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <BookOpen className="w-12 h-12 text-gray-300" />
                              </div>
                            )}
                          </div>
                        </Link>
                        
                        {/* Content */}
                        <div className="p-5">
                          <Link href={`/recipes/${encodeURIComponent(recipe.name)}`}>
                            <h4 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-gray-700 transition-colors line-clamp-2">
                              {recipe.name}
                            </h4>
                          </Link>
                          <p className="text-gray-500 text-xs uppercase tracking-wide">
                            {recipe.category || 'Uncategorized'}
                          </p>
                        </div>

                        {/* Delete button */}
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            setDeleteRecipe(recipe.name)
                          }}
                          className="absolute top-3 right-3 p-2 bg-white/90 hover:bg-red-50 rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-sm hover:text-red-600"
                          title="Delete recipe"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </>
  )
}
