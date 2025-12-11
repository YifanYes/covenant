import {
  Alert,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Battery,
  Bookmark,
  Briefcase,
  Bullseye,
  Bus,
  Calendar,
  Camera,
  Car,
  Cart,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Close,
  CloseBox,
  Cloud,
  Collapse,
  Copy,
  CreditCard,
  Deskphone,
  Dollar,
  Download,
  Drop,
  Edit,
  Expand,
  ExternalLink,
  Eye,
  EyeClosed,
  File,
  Flag,
  Folder,
  Forward,
  Gamepad,
  Gift,
  Gps,
  Grid,
  Heart,
  Home,
  HumanRun,
  Image,
  InfoBox,
  Label,
  Link,
  List,
  Lock,
  LockOpen,
  Login,
  Mail,
  Map,
  Menu,
  Message,
  Minus,
  Money,
  MoreHorizontal,
  MoreVertical,
  Move,
  Music,
  Next,
  Notification,
  Paperclip,
  Pause,
  Play,
  Plus,
  Prev,
  RadioHandheld,
  Reload,
  Repeat,
  Save,
  Search,
  Shield,
  Shuffle,
  Sliders,
  Sort,
  Sun,
  Trash,
  Trophy,
  Truck,
  Undo,
  Upload,
  User,
  Users,
  Video,
  Volume2,
  Wind,
  Zap,
  ZoomIn,
  ZoomOut
} from '@nsmr/pixelart-react'
import { TaskEffort, TaskImpact } from '@shared/schemas/tasks.schemas'

export const colorOptions = [
  {
    color: 'green',
    styles: 'border-2 border-green-400 bg-green-500/20 hover:bg-green-500/50',
    text: 'text-foreground'
  },
  {
    color: 'purple',
    styles: 'border-2 border-purple-400 bg-purple-500/20 hover:bg-purple-500/50',
    text: 'text-foreground'
  },
  {
    color: 'orange',
    styles: 'border-2 border-orange-400 bg-orange-500/20 hover:bg-orange-500/50',
    text: 'text-foreground'
  },
  {
    color: 'red',
    styles: 'border-2 border-red-400 bg-red-500/20 hover:bg-red-500/50',
    text: 'text-foreground'
  },
  {
    color: 'blue',
    styles: 'border-2 border-blue-400 bg-blue-500/20 hover:bg-blue-500/50',
    text: 'text-foreground'
  },
  {
    color: 'yellow',
    styles: 'border-2 border-yellow-400 bg-yellow-500/20 hover:bg-yellow-500/50',
    text: 'text-foreground'
  },
  {
    color: 'teal',
    styles: 'border-2 border-teal-400 bg-teal-500/20 hover:bg-teal-500/50',
    text: 'text-foreground'
  },
  {
    color: 'pink',
    styles: 'border-2 border-pink-400 bg-pink-500/20 hover:bg-pink-500/50',
    text: 'text-black'
  },
  {
    color: 'cyan',
    styles: 'border-2 border-cyan-400 bg-cyan-500/20 hover:bg-cyan-500/50',
    text: 'text-cyan-900'
  },
  {
    color: 'indigo',
    styles: 'border-2 border-indigo-400 bg-indigo-500/20 hover:bg-indigo-500/50',
    text: 'text-foreground'
  },
  {
    color: 'lime',
    styles: 'border-2 border-lime-400 bg-lime-500/20 hover:bg-lime-500/50',
    text: 'text-lime-900'
  },
  {
    color: 'rose',
    styles: 'border-2 border-rose-400 bg-rose-500/20 hover:bg-rose-500/50',
    text: 'text-foreground'
  },
  {
    color: 'amber',
    styles: 'border-2 border-amber-400 bg-amber-500/20 hover:bg-amber-500/50',
    text: 'text-amber-900'
  },
  {
    color: 'sky',
    styles: 'border-2 border-sky-400 bg-sky-500/20 hover:bg-sky-500/50',
    text: 'text-foreground'
  },
  {
    color: 'slate',
    styles: 'border-2 border-slate-400 bg-slate-500/20 hover:bg-slate-500/50',
    text: 'text-foreground'
  }
]

export type Icon = {
  name: string
  component: React.ComponentType<any>
}

export type IconCategoryKey =
  | 'all'
  | 'general'
  | 'navigation'
  | 'media'
  | 'communication'
  | 'files'
  | 'business'
  | 'security'
  | 'interface'
  | 'weather'

export const iconCategories: Record<IconCategoryKey, string> = {
  all: 'All Icons',
  general: 'General Icons',
  navigation: 'Navigation Icons',
  media: 'Media Icons',
  communication: 'Communication Icons',
  files: 'File Icons',
  business: 'Business Icons',
  security: 'Security Icons',
  interface: 'Interface Icons',
  weather: 'Weather Icons'
}

export const iconCollection: Record<Exclude<IconCategoryKey, 'all'>, Icon[]> = {
  general: [
    { name: 'Home', component: Home },
    { name: 'User', component: User },
    { name: 'Sliders', component: Sliders },
    { name: 'Zap', component: Zap },
    { name: 'Heart', component: Heart },
    { name: 'Plus', component: Plus },
    { name: 'Minus', component: Minus },
    { name: 'Check', component: Check },
    { name: 'Close', component: Close },
    { name: 'Search', component: Search },
    { name: 'Users', component: Users },
    { name: 'HumanRun', component: HumanRun },
    { name: 'Gamepad', component: Gamepad }
  ],
  navigation: [
    { name: 'ArrowRight', component: ArrowRight },
    { name: 'ArrowLeft', component: ArrowLeft },
    { name: 'ArrowUp', component: ArrowUp },
    { name: 'ArrowDown', component: ArrowDown },
    { name: 'ChevronUp', component: ChevronUp },
    { name: 'ChevronDown', component: ChevronDown },
    { name: 'ChevronLeft', component: ChevronLeft },
    { name: 'ChevronRight', component: ChevronRight },
    { name: 'Map', component: Map },
    { name: 'Gps', component: Gps },
    { name: 'Car', component: Car },
    { name: 'Truck', component: Truck },
    { name: 'Bus', component: Bus },
    { name: 'HumanRun', component: HumanRun }
  ],
  media: [
    { name: 'Play', component: Play },
    { name: 'Pause', component: Pause },
    { name: 'Next', component: Next },
    { name: 'Prev', component: Prev },
    { name: 'Repeat', component: Repeat },
    { name: 'Shuffle', component: Shuffle },
    { name: 'Volume2', component: Volume2 },
    { name: 'Camera', component: Camera },
    { name: 'RadioHandheld', component: RadioHandheld },
    { name: 'Image', component: Image },
    { name: 'Video', component: Video },
    { name: 'Music', component: Music }
  ],
  communication: [
    { name: 'Mail', component: Mail },
    { name: 'Deskphone', component: Deskphone },
    { name: 'Message', component: Message },
    { name: 'Forward', component: Forward },
    { name: 'Notification', component: Notification },
    { name: 'Forward', component: Forward },
    { name: 'Link', component: Link },
    { name: 'ExternalLink', component: ExternalLink },
    { name: 'Paperclip', component: Paperclip }
  ],
  files: [
    { name: 'File', component: File },
    { name: 'Folder', component: Folder },
    { name: 'Download', component: Download },
    { name: 'Upload', component: Upload },
    { name: 'Save', component: Save },
    { name: 'Copy', component: Copy },
    { name: 'Edit', component: Edit },
    { name: 'Trash', component: Trash }
  ],
  business: [
    { name: 'Money', component: Money },
    { name: 'Calendar', component: Calendar },
    { name: 'Clock', component: Clock },
    { name: 'Cart', component: Cart },
    { name: 'CreditCard', component: CreditCard },
    { name: 'Dollar', component: Dollar },
    { name: 'Gift', component: Gift },
    { name: 'Trophy', component: Trophy },
    { name: 'Trophy', component: Trophy },
    { name: 'Bullseye', component: Bullseye },
    { name: 'Flag', component: Flag },
    { name: 'Bookmark', component: Bookmark },
    { name: 'Label', component: Label },
    { name: 'Briefcase', component: Briefcase }
  ],
  security: [
    { name: 'Lock', component: Lock },
    { name: 'LockOpen', component: LockOpen },
    { name: 'Eye', component: Eye },
    { name: 'EyeClosed', component: EyeClosed },
    { name: 'Shield', component: Shield },
    { name: 'Login', component: Login }
  ],
  interface: [
    { name: 'Menu', component: Menu },
    { name: 'MoreHorizontal', component: MoreHorizontal },
    { name: 'MoreVertical', component: MoreVertical },
    { name: 'Grid', component: Grid },
    { name: 'List', component: List },
    { name: 'Sliders', component: Sliders },
    { name: 'Sort', component: Sort },
    { name: 'Reload', component: Reload },
    { name: 'Undo', component: Undo },
    { name: 'ZoomIn', component: ZoomIn },
    { name: 'ZoomOut', component: ZoomOut },
    { name: 'Move', component: Move },
    { name: 'Expand', component: Expand },
    { name: 'Collapse', component: Collapse },
    { name: 'InfoBox', component: InfoBox },
    { name: 'Alert', component: Alert },
    { name: 'Check', component: Check },
    { name: 'CloseBox', component: CloseBox },
    { name: 'InfoBox', component: InfoBox }
  ],
  weather: [
    { name: 'Sun', component: Sun },
    { name: 'Cloud', component: Cloud },
    { name: 'Zap', component: Zap },
    { name: 'Drop', component: Drop },
    { name: 'Wind', component: Wind },
    { name: 'Battery', component: Battery },
    { name: 'Map', component: Map }
  ]
}

export const allIcons: Icon[] = Object.values(iconCollection).flat()

export const areaStyles = [
  {
    color: 'green',
    styles:
      'dark:text-green-700 dark:border-green-700 dark:bg-green-200 dark:hover:text-green-600 dark:hover:border-green-600 dark:hover:bg-green-100 text-green-600 border-green-600 bg-green-100 hover:text-green-700 hover:border-green-700 hover:bg-green-200'
  },
  {
    color: 'purple',
    styles:
      'dark:text-purple-700 dark:border-purple-700 dark:bg-purple-200 dark:hover:text-purple-600 dark:hover:border-purple-600 dark:hover:bg-purple-100 text-purple-600 border-purple-600 bg-purple-100 hover:text-purple-700 hover:border-purple-700 hover:bg-purple-200'
  },
  {
    color: 'orange',
    styles:
      'dark:text-orange-700 dark:border-orange-700 dark:bg-orange-200 dark:hover:text-orange-600 dark:hover:border-orange-600 dark:hover:bg-orange-100 text-orange-600 border-orange-600 bg-orange-100 hover:text-orange-700 hover:border-orange-700 hover:bg-orange-200'
  },
  {
    color: 'red',
    styles:
      'dark:text-red-700 dark:border-red-700 dark:bg-red-200 dark:hover:text-red-600 dark:hover:border-red-600 dark:hover:bg-red-100 text-red-600 border-red-600 bg-red-100 hover:text-red-700 hover:border-red-700 hover:bg-red-200'
  },
  {
    color: 'blue',
    styles:
      'dark:text-blue-700 dark:border-blue-700 dark:bg-blue-200 dark:hover:text-blue-600 dark:hover:border-blue-600 dark:hover:bg-blue-100 text-blue-600 border-blue-600 bg-blue-100 hover:text-blue-700 hover:border-blue-700 hover:bg-blue-200'
  },
  {
    color: 'yellow',
    styles:
      'dark:text-yellow-700 dark:border-yellow-700 dark:bg-yellow-200 dark:hover:text-yellow-600 dark:hover:border-yellow-600 dark:hover:bg-yellow-100 text-yellow-600 border-yellow-600 bg-yellow-100 hover:text-yellow-700 hover:border-yellow-700 hover:bg-yellow-200'
  },
  {
    color: 'teal',
    styles:
      'dark:text-teal-700 dark:border-teal-700 dark:bg-teal-200 dark:hover:text-teal-600 dark:hover:border-teal-600 dark:hover:bg-teal-100 text-teal-600 border-teal-600 bg-teal-100 hover:text-teal-700 hover:border-teal-700 hover:bg-teal-200'
  },
  {
    color: 'pink',
    styles:
      'dark:text-pink-700 dark:border-pink-700 dark:bg-pink-200 dark:hover:text-pink-600 dark:hover:border-pink-600 dark:hover:bg-pink-100 text-pink-600 border-pink-600 bg-pink-100 hover:text-pink-700 hover:border-pink-700 hover:bg-pink-200'
  },
  {
    color: 'cyan',
    styles:
      'dark:text-cyan-700 dark:border-cyan-700 dark:bg-cyan-200 dark:hover:text-cyan-600 dark:hover:border-cyan-600 dark:hover:bg-cyan-100 text-cyan-600 border-cyan-600 bg-cyan-100 hover:text-cyan-700 hover:border-cyan-700 hover:bg-cyan-200'
  },
  {
    color: 'indigo',
    styles:
      'dark:text-indigo-700 dark:border-indigo-700 dark:bg-indigo-200 dark:hover:text-indigo-600 dark:hover:border-indigo-600 dark:hover:bg-indigo-100 text-indigo-600 border-indigo-600 bg-indigo-100 hover:text-indigo-700 hover:border-indigo-700 hover:bg-indigo-200'
  },
  {
    color: 'lime',
    styles:
      'dark:text-lime-700 dark:border-lime-700 dark:bg-lime-200 dark:hover:text-lime-600 dark:hover:border-lime-600 dark:hover:bg-lime-100 text-lime-600 border-lime-600 bg-lime-100 hover:text-lime-700 hover:border-lime-700 hover:bg-lime-200'
  },
  {
    color: 'rose',
    styles:
      'dark:text-rose-700 dark:border-rose-700 dark:bg-rose-200 dark:hover:text-rose-600 dark:hover:border-rose-600 dark:hover:bg-rose-100 text-rose-600 border-rose-600 bg-rose-100 hover:text-rose-700 hover:border-rose-700 hover:bg-rose-200'
  },
  {
    color: 'amber',
    styles:
      'dark:text-amber-700 dark:border-amber-700 dark:bg-amber-200 dark:hover:text-amber-600 dark:hover:border-amber-600 dark:hover:bg-amber-100 text-amber-600 border-amber-600 bg-amber-100 hover:text-amber-700 hover:border-amber-700 hover:bg-amber-200'
  },
  {
    color: 'sky',
    styles:
      'dark:text-sky-700 dark:border-sky-700 dark:bg-sky-200 dark:hover:text-sky-600 dark:hover:border-sky-600 dark:hover:bg-sky-100 text-sky-600 border-sky-600 bg-sky-100 hover:text-sky-700 hover:border-sky-700 hover:bg-sky-200'
  },
  {
    color: 'slate',
    styles:
      'dark:text-slate-700 dark:border-slate-700 dark:bg-slate-200 dark:hover:text-slate-600 dark:hover:border-slate-600 dark:hover:bg-slate-100 text-slate-600 border-slate-600 bg-slate-100 hover:text-slate-700 hover:border-slate-700 hover:bg-slate-200'
  }
]

export const areaSimpleStyles = [
  {
    color: 'green',
    styles: 'dark:text-green-300 text-green-600'
  },
  {
    color: 'purple',
    styles: 'dark:text-purple-300 text-purple-600'
  },
  {
    color: 'orange',
    styles: 'dark:text-orange-300 text-orange-600'
  },
  {
    color: 'red',
    styles: 'dark:text-red-300 text-red-600'
  },
  {
    color: 'blue',
    styles: 'dark:text-blue-300 text-blue-600'
  },
  {
    color: 'yellow',
    styles: 'dark:text-yellow-300 text-yellow-600'
  },
  {
    color: 'teal',
    styles: 'dark:text-teal-300 text-teal-600'
  },
  {
    color: 'pink',
    styles: 'dark:text-pink-300 text-pink-600'
  },
  {
    color: 'cyan',
    styles: 'dark:text-cyan-300 text-cyan-600'
  },
  {
    color: 'indigo',
    styles: 'dark:text-indigo-300 text-indigo-600'
  },
  {
    color: 'violet',
    styles: 'dark:text-violet-300 text-violet-600'
  },
  {
    color: 'gray',
    styles: 'dark:text-gray-300 text-gray-600'
  },
  {
    color: 'black',
    styles: 'dark:text-black-300 text-black-600'
  },
  {
    color: 'white',
    styles: 'dark:text-white-300 text-white-600'
  },
  {
    color: 'lime',
    styles: 'dark:text-lime-300 text-lime-600'
  },
  {
    color: 'rose',
    styles: 'dark:text-rose-300 text-rose-600'
  },
  {
    color: 'amber',
    styles: 'dark:text-amber-300 text-amber-600'
  },
  {
    color: 'sky',
    styles: 'dark:text-sky-300 text-sky-600'
  },
  {
    color: 'slate',
    styles: 'dark:text-slate-300 text-slate-600'
  }
]

export const taskPriorityTypes: Record<string, Record<string, string>> = {
  [TaskImpact.HIGH]: {
    [TaskEffort.LOW]: 'tasks.task_types.quick_win',
    [TaskEffort.HIGH]: 'tasks.task_types.major_project'
  },
  [TaskImpact.LOW]: {
    [TaskEffort.LOW]: 'tasks.task_types.fill_in',
    [TaskEffort.HIGH]: 'tasks.task_types.thankless_task'
  }
}
