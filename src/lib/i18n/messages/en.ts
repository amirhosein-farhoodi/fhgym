/*
 * English is the source of truth for the key set. Every other locale is typed against it,
 * so a missing or stray Persian key is a compile error rather than a blank label in prod.
 *
 * Keys are flat and dotted. Flat beats nested here: it gives exact autocomplete on the
 * whole key in one go, and it makes a missing translation a one-line diff.
 */
export const en = {
  // --- brand / chrome
  'app.name': 'FH Gym Assistant',
  'app.tagline': 'Programs that actually get followed.',

  // --- landing
  'landing.hero.line1': 'Train',
  'landing.hero.line2': 'Your',
  'landing.hero.line3': 'Crew',
  'landing.door.coach.title': "I'm a coach",
  'landing.door.coach.body': 'Sign in with Google, name your gym, start writing programs.',
  'landing.door.coach.cta': 'Sign in',
  'landing.door.trainee.title': 'I have a code',
  'landing.door.trainee.body': 'Scan the QR your coach gave you. No account, no password.',
  'landing.door.trainee.cta': 'Scan code',

  // --- common actions
  'action.save': 'Save',
  'action.cancel': 'Cancel',
  'action.delete': 'Delete',
  'action.edit': 'Edit',
  'action.add': 'Add',
  'action.back': 'Back',
  'action.next': 'Next',
  'action.done': 'Done',
  'action.retry': 'Try again',

  // --- navigation
  'nav.dashboard': 'Dashboard',
  'nav.trainees': 'Trainees',
  'nav.programs': 'Programs',
  'nav.exercises': 'Exercises',
  'nav.settings': 'Settings',
  'nav.today': 'Today',
  'nav.week': 'Week',
  'nav.history': 'History',

  // --- language
  'lang.switch': 'Language',
  'lang.en': 'English',
  'lang.fa': 'فارسی',

  // --- states
  'state.loading': 'Loading…',
  'state.empty.trainees.title': 'No trainees yet',
  'state.empty.trainees.body': 'Add your first trainee and hand them a QR code.',
  'error.generic.title': 'Something broke',
  'error.generic.body': 'That did not work. Try again, and tell us if it keeps happening.',
  'error.notfound.title': 'Nothing here',
  'error.notfound.body': 'That page does not exist.',
  'error.unconfigured.title': 'Not connected yet',
  'error.unconfigured.body':
    'This app has no Supabase project configured. Copy .env.example to .env.local and fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',

  // --- auth
  'auth.signingIn': 'Taking you to Google…',
  'auth.callback.working': 'Signing you in…',
  'auth.callback.failed.title': 'Sign-in did not finish',
  'auth.callback.failed.body': 'Google sent you back without a session. Try signing in again.',
  'auth.signOut': 'Sign out',

  // --- onboarding
  'onboarding.title': 'Name your gym',
  'onboarding.subtitle': 'This is what your trainees see on their card. You can change it later.',
  'onboarding.gymName.label': 'Gym name',
  'onboarding.gymName.placeholder': 'Iron House',
  'onboarding.gymName.tooShort': 'Give it at least 2 characters.',
  'onboarding.gymName.tooLong': 'Keep it under 80 characters.',
  'onboarding.timezone.label': 'Timezone',
  'onboarding.timezone.hint': 'Decides what counts as "today" for your trainees.',
  'onboarding.submit': 'Create gym',
  'onboarding.failed': 'Could not create the gym. Try again.',

  // --- coach
  'coach.dashboard.title': 'Dashboard',
  'coach.greeting': 'Welcome, {name}',
  'coach.gymLabel': 'Gym',
  'coach.catalogHint': '1,500 exercises with animations, filtered by muscle and equipment.',
  'coach.browseCatalog': 'Browse exercises',

  // --- exercise catalog
  'exercises.searchPlaceholder': 'Search exercises…',
  'exercises.clearFilters': 'Clear filters',
  'exercises.noResults': 'Nothing matches those filters.',
  'exercises.loadMore': 'Load more',
  'exercises.count': '{count} exercises',

  // --- trainees
  'trainees.add.title': 'Add a trainee',
  'trainees.add.submit': 'Create and show QR',
  'trainees.field.name': 'Name',
  'trainees.field.namePlaceholder': 'Reza Ahmadi',
  'trainees.field.phone': 'Phone (optional)',
  'trainees.status.active': 'Active',
  'trainees.status.revoked': 'Revoked',
  'trainees.action.program': 'Program',
  'trainees.action.newQr': 'New QR',
  'trainees.action.revoke': 'Revoke access',
  'trainees.action.revokeConfirm':
    'Revoke access for this trainee? Every device they use is signed out immediately.',
  'trainees.action.reactivate': 'Restore access',
  'trainees.qr.title': 'Scan to sign in',
  'trainees.qr.copyLink': 'Copy link',
  'trainees.qr.oneTimeWarning':
    'This code is shown once. Close this and it is gone — you can issue a new one, but the old code stops working.',

  // --- trainee side
  'claim.failed.title': 'That code did not work',
  'claim.failed.body': 'It may have been revoked or replaced. Ask your coach for a new one.',
  'trainee.hello': 'Hi {name}',
  'trainee.noProgram': 'Your coach has not assigned a program yet.',
  'trainee.restDay': 'Rest day',
  'trainee.restDayBody': 'Nothing scheduled. Eat, sleep, come back stronger.',
  'trainee.markDone': 'Mark done',
  'trainee.undo': 'Undo',
  'trainee.doneCount': '{done} of {total} done',
  'trainee.lastTime': 'Last time ({date}): {done} done',

  // --- programs
  'program.status.draft': 'Draft',
  'program.status.active': 'Active',
  'program.status.completed': 'Completed',
  'program.status.archived': 'Archived',
  'program.template': 'Template',
  'programs.new.title': 'New program',
  'programs.new.name': 'Program name',
  'programs.new.namePlaceholder': 'Hypertrophy block',
  'programs.new.templatePlaceholder': 'Push / Pull / Legs',
  'programs.new.daysPerWeek': 'Days per week',
  'programs.new.create': 'Create',
  'programs.newTemplate': 'New template',
  'programs.fromTemplate': 'Or start from a template',
  'programs.dayWeek': 'days a week',
  'programs.none': 'No programs yet.',
  'programs.noTemplates': 'No templates yet. Build a program, then save it as one.',
  'programs.templatesHint':
    'Write a split once and reuse it for every trainee. Duplicating a template copies every day and exercise.',
  'programs.deleteConfirm': 'Delete this program? This cannot be undone.',

  // --- builder
  'builder.programTitle': 'Program name',
  'builder.day': 'Day',
  'builder.dayTitle': 'Day name',
  'builder.dayTitlePlaceholder': 'Chest & triceps',
  'builder.restDay': 'Rest day',
  'builder.addExercises': 'Add exercises',
  'builder.emptyDay': 'No exercises on this day yet.',
  'builder.activate': 'Assign to trainee',
  'builder.duplicate': 'Duplicate',
  'builder.saveAsTemplate': 'Save as template',
  'builder.sets': 'Sets',
  'builder.repsMin': 'Reps',
  'builder.repsMax': 'to',
  'builder.weight': 'Weight',
  'builder.rest': 'Rest (s)',
  'builder.supersetGroup': 'SS',
  'builder.superset': 'Superset',
  'builder.note': 'Note',
  'builder.moveUp': 'Move up',
  'builder.moveDown': 'Move down',
  'builder.picker.title': 'Add exercises',
  'builder.picker.bookmarks': 'Saved',
  'builder.picker.all': 'All',
  'builder.picker.add': 'Add {count}',
  'exercises.bookmark': 'Save',
  'exercises.bookmarked': 'Saved',
  'exercises.custom.new': 'New exercise',
  'exercises.custom.title': 'Your own exercise',
  'exercises.custom.hint':
    'For a machine your gym has that the catalog does not, or a movement you prescribe by your own name. Only your gym sees it.',
  'exercises.custom.name': 'Name',
  'exercises.custom.nameFa': 'Persian name (optional)',
  'exercises.custom.categories': 'Muscle groups',
  'exercises.custom.equipment': 'Equipment (optional)',
  'exercises.custom.media': 'Image or GIF URL (optional)',
  'exercises.custom.mediaHint': 'Paste a link to an animation or photo.',
  'exercises.custom.instructions': 'Instructions (optional)',
  'exercises.custom.instructionsHint': 'One step per line.',
} as const
