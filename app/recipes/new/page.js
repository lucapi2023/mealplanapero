'use client'

import AuthGuard from '@/components/AuthGuard'
import Layout from '@/components/Layout'
import RecipeForm from '@/components/RecipeForm'
import { Suspense } from 'react'

export default function NewRecipePage() {
  return (
    <AuthGuard>
      <Layout>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">New Recipe</h1>
        <Suspense fallback={<div>Loading...</div>}>
          <RecipeForm />
        </Suspense>
      </Layout>
    </AuthGuard>
  )
}
