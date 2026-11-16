import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { Landing } from '@/routes/Landing'
import { NotFound } from '@/routes/NotFound'
import { Onboarding } from '@/routes/Onboarding'
import { Claim } from '@/routes/Claim'
import { AuthCallback } from '@/routes/auth/Callback'
import { CoachDashboard } from '@/routes/coach/Dashboard'
import { Exercises } from '@/routes/coach/Exercises'
import { NewExercise } from '@/routes/coach/NewExercise'
import { Settings } from '@/routes/coach/Settings'
import { Trainees } from '@/routes/coach/Trainees'
import { TraineePrograms } from '@/routes/coach/TraineePrograms'
import { Programs } from '@/routes/coach/Programs'
import { ProgramBuilder } from '@/routes/coach/ProgramBuilder'
import { TraineeToday } from '@/routes/trainee/Today'
import { RedirectIfOnboarded, RequireAuth, RequireGym } from './guards'

function coachRoute(element: React.ReactElement) {
  return (
    <RequireAuth>
      <RequireGym>{element}</RequireGym>
    </RequireAuth>
  )
}

const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <RedirectIfOnboarded>
        <Landing />
      </RedirectIfOnboarded>
    ),
  },
  { path: '/auth/callback', element: <AuthCallback /> },
  {
    path: '/onboarding',
    element: (
      <RequireAuth>
        <RedirectIfOnboarded>
          <Onboarding />
        </RedirectIfOnboarded>
      </RequireAuth>
    ),
  },

  // --- coach
  { path: '/coach', element: coachRoute(<CoachDashboard />) },
  { path: '/coach/trainees', element: coachRoute(<Trainees />) },
  { path: '/coach/trainees/:traineeId/program', element: coachRoute(<TraineePrograms />) },
  { path: '/coach/programs', element: coachRoute(<Programs />) },
  { path: '/coach/programs/:programId', element: coachRoute(<ProgramBuilder />) },
  { path: '/coach/exercises', element: coachRoute(<Exercises />) },
  { path: '/coach/exercises/new', element: coachRoute(<NewExercise />) },
  { path: '/coach/settings', element: coachRoute(<Settings />) },

  // --- trainee: /j/:token is the QR target, /me is where it lands them.
  // Neither sits behind RequireGym — a trainee has no gym membership, only a device link.
  { path: '/j/:token', element: <Claim /> },
  { path: '/me', element: <TraineeToday /> },

  { path: '*', element: <NotFound /> },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
