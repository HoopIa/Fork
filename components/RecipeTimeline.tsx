import { useState, useRef } from 'react'
import { Star, Camera, Upload } from 'lucide-react'

interface HistoryItem {
  sha: string
  message: string
  date: string
  author: string
  version: number
  rating: number | null
  image: string | null
}

interface RecipeTimelineProps {
  history: HistoryItem[]
  recipeName: string
  onRatingUpdate: () => void
}

export default function RecipeTimeline({ history, recipeName, onRatingUpdate }: RecipeTimelineProps) {
  const [editingRating, setEditingRating] = useState<string | null>(null)
  const [ratingValue, setRatingValue] = useState<number>(5.0)
  const [uploadingImage, setUploadingImage] = useState<string | null>(null)
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({})

  const handleImageUpload = async (item: HistoryItem, file: File) => {
    if (!file) return
    
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Image size must be less than 10MB')
      return
    }
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }
    
    setUploadingImage(item.sha)
    
    const reader = new FileReader()
    reader.onloadend = async () => {
      const base64 = reader.result as string
      const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
      
      try {
        const res = await fetch(`/api/recipes/${encodeURIComponent(recipeName)}/version-images`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sha: item.sha,
            version: item.version,
            image: base64,
            filename,
          }),
        })
        
        if (res.ok) {
          onRatingUpdate() // Refresh the history to show new image
        } else {
          const error = await res.json()
          alert(error.error || 'Failed to upload image')
        }
      } catch (error) {
        console.error('Error uploading image:', error)
        alert('Failed to upload image')
      } finally {
        setUploadingImage(null)
      }
    }
    
    reader.readAsDataURL(file)
  }

  const handleRatingClick = (item: HistoryItem) => {
    setEditingRating(item.sha)
    setRatingValue(item.rating || 5.0)
  }

  const handleRatingSave = async (sha: string, version: number) => {
    try {
      const res = await fetch(`/api/recipes/${encodeURIComponent(recipeName)}/ratings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sha, rating: ratingValue, version }),
      })

      if (res.ok) {
        setEditingRating(null)
        onRatingUpdate()
      } else {
        alert('Failed to save rating')
      }
    } catch (error) {
      console.error('Error saving rating:', error)
      alert('Failed to save rating')
    }
  }

  // Get min and max ratings for scaling
  const ratings = history.map(h => h.rating).filter((r): r is number => r !== null)
  const minRating = ratings.length > 0 ? Math.min(...ratings, 1.0) : 1.0
  const maxRating = ratings.length > 0 ? Math.max(...ratings, 10.0) : 10.0
  const ratingRange = maxRating - minRating || 1

  // Get date range for X axis
  const dates = history.map(h => new Date(h.date).getTime())
  const minDate = Math.min(...dates)
  const maxDate = Math.max(...dates)
  const dateRange = maxDate - minDate || 1

  // Padding from edges (percentage)
  const xPadding = 10 // 10% padding on each side
  const usableWidth = 100 - (xPadding * 2) // 80% usable width

  // Calculate positions for points with even spacing
  const points = history.map((item, index) => {
    let x: number
    if (history.length === 1) {
      // Single point goes in the center
      x = 50
    } else {
      // Distribute points evenly across the usable width
      x = xPadding + (index / (history.length - 1)) * usableWidth
    }
    const rating = item.rating || 5.0
    const y = 100 - (((rating - minRating) / ratingRange) * 80) - 10 // Leave 10% margin on top and bottom
    return { ...item, x, y, index }
  })

  if (history.length === 0) {
    return (
      <div className="bg-white border border-gray-100 p-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-8 tracking-tight">Recipe Evolution Timeline</h2>
        <p className="text-gray-500">No version history available yet.</p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-100 p-8">
      <h2 className="text-3xl font-bold text-gray-900 mb-8 tracking-tight">Recipe Evolution Timeline</h2>
      
      {/* Timeline Graph */}
      <div className="relative mb-12" style={{ minHeight: '750px' }}>
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-0 w-20 flex flex-col justify-between text-base text-gray-700 font-bold">
          <span className="text-right pr-3">{maxRating.toFixed(1)}</span>
          <span className="text-right pr-3">{((maxRating + minRating) / 2).toFixed(1)}</span>
          <span className="text-right pr-3">{minRating.toFixed(1)}</span>
        </div>

        {/* Graph area */}
        <div className="ml-20 relative border-l-2 border-b-2 border-gray-900" style={{ height: '450px' }}>
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((y) => (
            <div
              key={y}
              className="absolute w-full border-t border-gray-200"
              style={{ bottom: `${y}%` }}
            />
          ))}

          {/* Data points and lines */}
          <svg className="absolute inset-0 w-full h-full" style={{ overflow: 'visible' }}>
            {/* Connect points with lines */}
            {points.length > 1 && (
              <polyline
                points={points.map(p => `${p.x}%,${100 - p.y}%`).join(' ')}
                fill="none"
                stroke="#000"
                strokeWidth="4"
                className="opacity-40"
              />
            )}

            {/* Data points with images and descriptions */}
            {points.map((point, index) => {
              const date = new Date(point.date)
              
              return (
                <g key={point.sha} className="cursor-pointer" onClick={() => handleRatingClick(point)}>
                  {/* Connection line from point to image/description area */}
                  <line
                    x1={`${point.x}%`}
                    y1={`${100 - point.y}%`}
                    x2={`${point.x}%`}
                    y2="100%"
                    stroke="#d1d5db"
                    strokeWidth="2"
                    strokeDasharray="6,4"
                    className="opacity-60"
                  />
                  
                  {/* Large prominent node with shadow effect */}
                  <defs>
                    <filter id="shadow">
                      <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.3"/>
                    </filter>
                  </defs>
                  
                  {/* Outer ring for prominence */}
                  <circle
                    cx={`${point.x}%`}
                    cy={`${100 - point.y}%`}
                    r="24"
                    fill="none"
                    stroke={point.rating ? "#000" : "#94a3b8"}
                    strokeWidth="2"
                    className="opacity-30"
                  />
                  
                  {/* Main node */}
                  <circle
                    cx={`${point.x}%`}
                    cy={`${100 - point.y}%`}
                    r="20"
                    fill={point.rating ? "#000" : "#94a3b8"}
                    stroke="white"
                    strokeWidth="5"
                    className="hover:opacity-90 transition-opacity"
                    filter="url(#shadow)"
                  />
                  
                  {/* Version number inside node */}
                  <text
                    x={`${point.x}%`}
                    y={`${100 - point.y}%`}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-sm fill-white font-bold"
                  >
                    {point.version}
                  </text>
                  
                  {/* Date label above node */}
                  <text
                    x={`${point.x}%`}
                    y={`${100 - point.y - 3}%`}
                    textAnchor="middle"
                    className="text-[10px] fill-gray-600 font-medium"
                    style={{ transform: 'translateY(-35px)' }}
                  >
                    {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </text>
                  
                  {/* Rating display below node */}
                  {point.rating && (
                    <text
                      x={`${point.x}%`}
                      y={`${100 - point.y + 3}%`}
                      textAnchor="middle"
                      className="text-[10px] fill-gray-700 font-bold"
                      style={{ transform: 'translateY(30px)' }}
                    >
                      ⭐ {point.rating.toFixed(1)}
                    </text>
                  )}
                </g>
              )
            })}
          </svg>
        </div>

        {/* Bottom section with images, dates, and descriptions */}
        <div className="ml-20 mt-8 pr-4">
          <div className="relative" style={{ minHeight: '320px', width: '100%' }}>
            {points.map((point, index) => {
              const date = new Date(point.date)
              const isUploading = uploadingImage === point.sha
              
              return (
                <div
                  key={point.sha}
                  className="absolute flex flex-col items-center text-center"
                  style={{ 
                    left: `${point.x}%`, 
                    top: 0, 
                    width: '140px',
                    transform: 'translateX(-50%)'
                  }}
                >
                  {/* Image with upload capability */}
                  <div className="mb-3 relative group">
                    {point.image ? (
                      <div className="w-28 h-28 rounded-full overflow-hidden border-3 border-gray-900 shadow-md">
                        <img
                          src={point.image}
                          alt={`Version ${point.version}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-28 h-28 rounded-full bg-gray-100 border-3 border-gray-300 flex items-center justify-center">
                        <Camera className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                    
                    {/* Upload overlay */}
                    <label 
                      className={`absolute inset-0 w-28 h-28 rounded-full flex items-center justify-center cursor-pointer transition-opacity ${
                        isUploading ? 'opacity-100 bg-black/50' : 'opacity-0 hover:opacity-100 bg-black/40'
                      }`}
                    >
                      {isUploading ? (
                        <span className="text-white text-xs font-medium">Uploading...</span>
                      ) : (
                        <div className="flex flex-col items-center text-white">
                          <Upload className="w-5 h-5 mb-1" />
                          <span className="text-[10px] font-medium">
                            {point.image ? 'Change' : 'Add Photo'}
                          </span>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        disabled={isUploading}
                        ref={el => fileInputRefs.current[point.sha] = el}
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleImageUpload(point, file)
                          e.target.value = ''
                        }}
                      />
                    </label>
                  </div>
                  
                  {/* Version number badge */}
                  <div className="mb-2">
                    <span className="inline-block px-2.5 py-0.5 bg-gray-900 text-white text-xs font-bold uppercase tracking-wide">
                      v{point.version}
                    </span>
                  </div>
                  
                  {/* Date */}
                  <div className="mb-2">
                    <div className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                      {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                    <div className="text-[10px] text-gray-500">
                      {date.toLocaleDateString('en-US', { year: 'numeric' })}
                    </div>
                  </div>
                  
                  {/* Change description */}
                  <div className="mb-2 px-1">
                    <div className="text-[11px] text-gray-700 leading-snug font-medium line-clamp-3">
                      {point.message}
                    </div>
                  </div>
                  
                  {/* Rating */}
                  {point.rating && (
                    <div className="mt-1 flex items-center gap-1">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      <span className="text-xs font-bold text-gray-900">{point.rating.toFixed(1)}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* X-axis (time) */}
        <div className="ml-20 mt-6 flex justify-between text-xs text-gray-600 font-medium">
          {points.length > 0 && (
            <>
              <span>{new Date(points[0].date).toLocaleDateString()}</span>
              {points.length > 1 && (
                <span>{new Date(points[Math.floor(points.length / 2)].date).toLocaleDateString()}</span>
              )}
              <span>{new Date(points[points.length - 1].date).toLocaleDateString()}</span>
            </>
          )}
        </div>
      </div>

      {/* History list with ratings */}
      <div className="space-y-3">
        <h3 className="text-xl font-bold text-gray-900 mb-6 tracking-tight">Version History</h3>
        {history.map((item) => (
          <div
            key={item.sha}
            className="flex items-center justify-between p-5 border border-gray-100 hover:border-gray-300 transition-colors"
          >
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <span className="text-sm font-semibold text-orange-600">v{item.version}</span>
                <p className="text-sm font-medium text-gray-900">{item.message}</p>
              </div>
              <p className="text-xs text-gray-500">
                {new Date(item.date).toLocaleString()} • {item.author}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {editingRating === item.sha ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1.0"
                    max="10.0"
                    step="0.1"
                    value={ratingValue}
                    onChange={(e) => setRatingValue(parseFloat(e.target.value) || 5.0)}
                    className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-orange-500"
                  />
                  <button
                    onClick={() => handleRatingSave(item.sha, item.version)}
                    className="px-4 py-1.5 text-sm bg-gray-900 text-white hover:bg-gray-800 font-medium uppercase tracking-wide"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingRating(null)}
                    className="px-4 py-1.5 text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium uppercase tracking-wide"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleRatingClick(item)}
                  className="flex items-center gap-1 px-4 py-2 text-sm border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors font-medium uppercase tracking-wide"
                >
                  <Star className={`w-4 h-4 ${item.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`} />
                  <span className="text-gray-700">
                    {item.rating ? item.rating.toFixed(1) : 'Rate'}
                  </span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

