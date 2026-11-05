import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = async (userObj) => {
    if (!userObj) return null
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userObj.id)
        .single()

      if (data) return data

      // If profile doesn't exist in Supabase yet, create it
      if (error && error.code === 'PGRST116') {
        const initialProfile = {
          id: userObj.id,
          email: userObj.email,
          full_name: userObj.user_metadata?.full_name || userObj.email?.split('@')[0] || 'User',
          role: 'user',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        const { data: created, error: insertErr } = await supabase
          .from('profiles')
          .upsert(initialProfile, { onConflict: 'id' })
          .select()
          .single()

        if (!insertErr && created) {
          return created
        }
        return initialProfile
      }
      return null
    } catch (err) {
      console.error('Error fetching profile:', err)
      return null
    }
  }

  useEffect(() => {
    const getSession = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession()

        setSession(currentSession)
        setUser(currentSession?.user ?? null)

        if (currentSession?.user) {
          const profileData = await fetchProfile(currentSession.user)
          setProfile(profileData)
        }
      } catch (err) {
        console.error('Error getting session:', err)
      } finally {
        setLoading(false)
      }
    }

    getSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        setSession(newSession)
        setUser(newSession?.user ?? null)

        if (newSession?.user) {
          const profileData = await fetchProfile(newSession.user)
          setProfile(profileData)
        } else {
          setProfile(null)
        }

        if (event === 'SIGNED_OUT') {
          setProfile(null)
        }

        setLoading(false)
      }
    )

    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  const signUp = async (email, password, fullName) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      })

      if (error) throw error

      if (data.user) {
        // Use upsert to handle cases where the profile may already exist
        // Small delay to ensure the auth session is fully established for RLS
        await new Promise(resolve => setTimeout(resolve, 500))

        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            email: email,
            full_name: fullName,
            role: 'user',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: 'id' })

        if (profileError) {
          console.error('Error creating profile:', profileError)
        } else {
          setProfile({
            id: data.user.id,
            email,
            full_name: fullName,
            role: 'user',
          })
        }
      }

      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error

      setUser(null)
      setSession(null)
      setProfile(null)

      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  const updateProfile = async (updates) => {
    try {
      if (!user) throw new Error('No user logged in')

      const { data, error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) throw error

      setProfile(data)
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  const deleteAccount = async () => {
    try {
      if (!user) throw new Error('No user logged in')

      const { error: reservationsError } = await supabase
        .from('reservations')
        .delete()
        .eq('user_id', user.id)

      if (reservationsError) {
        console.error('Error deleting reservations:', reservationsError)
      }

      const { error: feedbackError } = await supabase
        .from('feedback')
        .delete()
        .eq('user_id', user.id)

      if (feedbackError) {
        console.error('Error deleting feedback:', feedbackError)
      }

      const { error: profileDeleteError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id)

      if (profileDeleteError) {
        console.error('Error deleting profile:', profileDeleteError)
      }

      const { error: signOutError } = await supabase.auth.signOut()
      if (signOutError) throw signOutError

      setUser(null)
      setSession(null)
      setProfile(null)

      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  const value = {
    user,
    session,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
    deleteAccount,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthContext
