'use client'

import AuthGuard from '@/components/AuthGuard'
import Layout from '@/components/Layout'
import RecipeForm from '@/components/RecipeForm'
import { Suspense } from 'react'

export default function NewRecipePage() {
  return (
    <AuthGuard>
      <Layout>
        <h1 className="text-2xl font-bold mb-2" style={{ color: '#fff' }}>Recipe</h1>
        <p className="text-sm mb-8" style={{ color: '#666' }}>Create or edit a recipe with per-serving ingredient amounts</p>
        <Suspense fallback={<div style={{ color: '#666' }}>Loading...</div>}>
          <RecipeForm />
        </Suspense>
      </Layout>
    </AuthGuard>
  )
}
