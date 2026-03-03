import React, { useState } from 'react'
import { Eye, MessageSquare, Zap, TrendingUp, Users, Award, X, ThumbsUp, MessageCircle, AlertTriangle } from 'react-feather'

interface Reviewer {
  name: string
  avatar: string
  reviews: number
  avgTime: string
  accuracy: number
}

interface ReviewMetric {
  title: string
  value: string
  change: string
  icon: React.ReactNode
  color: string
}

interface Review {
  id: string
  title: string
  author: string
  comments: number
  time: string
  files: number
  changes: { additions: number; deletions: number }
}

interface ReviewModal {
  visible: boolean
  review: Review | null
}

export const CodeReviewAnalytics: React.FC = () => {
  const [reviews] = useState<Review[]>([
    { id: '1', title: 'Implement new auth system', author: 'Alice', comments: 12, time: '2 hours', files: 8, changes: { additions: 345, deletions: 89 } },
    { id: '2', title: 'Update database schema', author: 'Bob', comments: 8, time: '4 hours', files: 5, changes: { additions: 256, deletions: 120 } },
    { id: '3', title: 'Fix critical bug in API', author: 'Charlie', comments: 5, time: '1 hour', files: 3, changes: { additions: 145, deletions: 67 } },
    { id: '4', title: 'Refactor util functions', author: 'Diana', comments: 15, time: '3 hours', files: 12, changes: { additions: 567, deletions: 234 } },
  ])

  const [topReviewers] = useState<Reviewer[]>([
    { name: 'Alice Johnson', avatar: '👩‍💻', reviews: 48, avgTime: '45 min', accuracy: 94 },
    { name: 'Bob Smith', avatar: '👨‍💻', reviews: 42, avgTime: '1 hour', accuracy: 89 },
    { name: 'Carol White', avatar: '👩‍🔬', reviews: 38, avgTime: '1.5 hours', accuracy: 92 },
    { name: 'David Brown', avatar: '👨‍🔬', reviews: 35, avgTime: '2 hours', accuracy: 87 },
  ])

  const [modal, setModal] = useState<ReviewModal>({ visible: false, review: null })
  const [reviewComments, setReviewComments] = useState<string>('')

  const metrics: ReviewMetric[] = [
    { title: 'Avg Review Time', value: '1.2h', change: '-15% vs last week', icon: <Zap size={24} />, color: 'text-yellow-400' },
    { title: 'Total Reviews', value: '163', change: '+24 this week', icon: <MessageSquare size={24} />, color: 'text-blue-400' },
    { title: 'Approval Rate', value: '91%', change: '+2% vs last week', icon: <Award size={24} />, color: 'text-green-400' },
    { title: 'Top Reviewer', value: 'Alice', change: '48 reviews this month', icon: <Users size={24} />, color: 'text-purple-400' },
  ]

  const openReview = (review: Review) => {
    setModal({ visible: true, review })
  }

  const closeReview = () => {
    setModal({ visible: false, review: null })
    setReviewComments('')
  }

  const handleReviewAction = (action: string) => {
    switch (action) {
      case 'approve':
        alert('Review approved! Changes committed.')
        closeReview()
        break
      case 'request-changes':
        alert('Changes requested. Feedback sent to author.')
        closeReview()
        break
      case 'comment':
        if (reviewComments.trim()) {
          alert(`Comment posted: "${reviewComments}"`)
          setReviewComments('')
        } else {
          alert('Please enter a comment')
        }
        break
      case 'dismiss':
        alert('Review dismissed.')
        closeReview()
        break
    }
  }

  return (
    <div className="w-full h-screen bg-github-900 text-white overflow-y-auto">
      <div className="bg-github-800 border-b border-github-700 p-6">
        <div className="flex items-center gap-3">
          <Eye size={28} />
          <div>
            <h1 className="text-3xl font-bold">Code Review Analytics</h1>
            <p className="text-sm text-github-400">Team code review metrics and insights</p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((metric, i) => (
            <div key={i} className="bg-github-800 border border-github-700 rounded-lg p-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-github-400 text-sm">{metric.title}</p>
                <span className={metric.color}>{metric.icon}</span>
              </div>
              <p className="text-3xl font-bold mb-2">{metric.value}</p>
              <p className="text-xs text-github-500">{metric.change}</p>
            </div>
          ))}
        </div>

        <div className="bg-github-800 border border-github-700 rounded-lg overflow-hidden">
          <div className="border-b border-github-700 p-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Eye size={20} />
              Pending Reviews
            </h2>
          </div>
          <div className="divide-y divide-github-700">
            {reviews.map((review) => (
              <div key={review.id} className="p-4 hover:bg-github-700/50 transition cursor-pointer" onClick={() => openReview(review)}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-semibold">{review.title}</p>
                    <p className="text-sm text-github-400">by {review.author}</p>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1 text-github-400">
                      <MessageSquare size={16} />
                      {review.comments}
                    </span>
                    <span className="text-github-400">{review.time}</span>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation()
                        openReview(review)
                      }}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm transition">
                      Review
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-github-800 border border-github-700 rounded-lg overflow-hidden">
          <div className="border-b border-github-700 p-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <TrendingUp size={20} />
              Top Reviewers (This Month)
            </h2>
          </div>
          <div className="divide-y divide-github-700">
            {topReviewers.map((reviewer, idx) => (
              <div key={idx} className="p-4 hover:bg-github-700/50 transition">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{reviewer.avatar}</span>
                    <div>
                      <p className="font-semibold">{reviewer.name}</p>
                      <p className="text-sm text-github-400">
                        {reviewer.reviews} reviews • Avg {reviewer.avgTime} • {reviewer.accuracy}% accuracy
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="inline-flex items-center gap-2 bg-green-600/20 px-3 py-1 rounded">
                      <Award size={16} className="text-green-400" />
                      <span className="text-sm font-semibold">#{idx + 1}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-github-800 border border-github-700 rounded-lg p-6">
            <h3 className="text-lg font-bold mb-4">Weekly Review Distribution</h3>
            <div className="space-y-3">
              {[
                { day: 'Mon', reviews: 24, color: 'bg-blue-500' },
                { day: 'Tue', reviews: 19, color: 'bg-blue-500' },
                { day: 'Wed', reviews: 32, color: 'bg-green-500' },
                { day: 'Thu', reviews: 28, color: 'bg-blue-500' },
                { day: 'Fri', reviews: 21, color: 'bg-blue-500' },
                { day: 'Sat', reviews: 12, color: 'bg-gray-500' },
                { day: 'Sun', reviews: 8, color: 'bg-gray-500' },
              ].map((item) => (
                <div key={item.day}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{item.day}</span>
                    <span className="text-github-400">{item.reviews} reviews</span>
                  </div>
                  <div className="w-full bg-github-700 rounded-full h-2">
                    <div className={`${item.color} h-2 rounded-full`} style={{ width: `${(item.reviews / 32) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-github-800 border border-github-700 rounded-lg p-6">
            <h3 className="text-lg font-bold mb-4">Review Feedback Categories</h3>
            <div className="space-y-3">
              {[
                { category: 'Code Quality', percentage: 35, color: 'bg-green-500' },
                { category: 'Performance', percentage: 25, color: 'bg-blue-500' },
                { category: 'Security', percentage: 20, color: 'bg-red-500' },
                { category: 'Documentation', percentage: 12, color: 'bg-yellow-500' },
                { category: 'Testing', percentage: 8, color: 'bg-purple-500' },
              ].map((item) => (
                <div key={item.category}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{item.category}</span>
                    <span className="text-github-400">{item.percentage}%</span>
                  </div>
                  <div className="w-full bg-github-700 rounded-full h-2">
                    <div className={`${item.color} h-2 rounded-full`} style={{ width: `${item.percentage}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {modal.visible && modal.review && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-github-800 border border-github-700 rounded-lg max-w-2xl w-full mx-4 my-8 shadow-xl">
            <div className="border-b border-github-700 p-6 flex items-start justify-between sticky top-0 bg-github-800">
              <div className="flex-1">
                <h2 className="text-2xl font-bold">{modal.review.title}</h2>
                <p className="text-sm text-github-400 mt-2">by {modal.review.author}</p>
              </div>
              <button onClick={closeReview} className="p-1 hover:bg-github-700 rounded transition">
                <X size={20} className="text-github-400" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-github-900 rounded p-4">
                  <p className="text-xs text-github-500 mb-1">Files Changed</p>
                  <p className="text-2xl font-bold">{modal.review.files}</p>
                </div>
                <div className="bg-github-900 rounded p-4">
                  <p className="text-xs text-github-500 mb-1">Comments</p>
                  <p className="text-2xl font-bold">{modal.review.comments}</p>
                </div>
              </div>

              <div className="bg-github-900 rounded p-4">
                <div className="flex gap-4 mb-3">
                  <div>
                    <p className="text-xs text-github-500">Additions</p>
                    <p className="text-lg font-bold text-green-400">+{modal.review.changes.additions}</p>
                  </div>
                  <div>
                    <p className="text-xs text-github-500">Deletions</p>
                    <p className="text-lg font-bold text-red-400">-{modal.review.changes.deletions}</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-github-700 pt-4">
                <label className="block text-sm font-semibold mb-2">Add Review Comment</label>
                <textarea
                  value={reviewComments}
                  onChange={(e) => setReviewComments(e.target.value)}
                  placeholder="Share your feedback..."
                  className="w-full px-3 py-2 bg-github-900 border border-github-700 rounded text-white placeholder-github-500 focus:border-blue-500 focus:outline-none"
                  rows={4}
                />
              </div>

              <div className="border-t border-github-700 pt-6 grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleReviewAction('comment')}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded transition flex items-center justify-center gap-2"
                >
                  <MessageCircle size={18} />
                  Comment
                </button>
                <button
                  onClick={() => handleReviewAction('approve')}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded transition flex items-center justify-center gap-2"
                >
                  <ThumbsUp size={18} />
                  Approve
                </button>
                <button
                  onClick={() => handleReviewAction('request-changes')}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition flex items-center justify-center gap-2 col-span-2"
                >
                  <AlertTriangle size={18} />
                  Request Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
