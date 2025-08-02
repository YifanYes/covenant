import type { LucideIcon } from 'lucide-react'
import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  Award,
  Banknote,
  Battery,
  Bell,
  Bike,
  Bookmark,
  Brain,
  BriefcaseBusiness,
  Calendar,
  Camera,
  Car,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Cloud,
  CloudRain,
  Copy,
  CreditCard,
  DollarSign,
  Download,
  Droplets,
  Dumbbell,
  Edit,
  ExternalLink,
  Eye,
  EyeOff,
  File,
  Filter,
  Flag,
  Flame,
  Folder,
  Gamepad2,
  Gift,
  Globe,
  Grid,
  Heart,
  HelpCircle,
  Home,
  Image,
  Info,
  Key,
  Link,
  List,
  Lock,
  Mail,
  Map,
  Maximize,
  Menu,
  MessageCircle,
  Mic,
  Minimize,
  Minus,
  Moon,
  MoreHorizontal,
  MoreVertical,
  Move,
  Music,
  Navigation,
  Paperclip,
  Pause,
  Phone,
  Plane,
  Play,
  Plus,
  RefreshCw,
  Repeat,
  RotateCcw,
  Save,
  Search,
  Send,
  Settings,
  Share,
  Shield,
  ShoppingCart,
  Shuffle,
  Signal,
  SkipBack,
  SkipForward,
  Snowflake,
  Star,
  Sun,
  Sunrise,
  Sunset,
  Tag,
  Target,
  Thermometer,
  Train,
  Trash,
  Trophy,
  Unlock,
  Upload,
  User,
  Users,
  Video,
  Volume2,
  Wifi,
  Wind,
  X,
  XCircle,
  Zap,
  ZoomIn,
  ZoomOut
} from 'lucide-react'

export const colorOptions = [
  {
    color: 'green',
    styles: 'bg-green-500'
  },
  {
    color: 'purple',
    styles: 'bg-purple-500'
  },
  {
    color: 'orange',
    styles: 'bg-orange-500'
  },
  {
    color: 'red',
    styles: 'bg-red-500'
  },
  {
    color: 'blue',
    styles: 'bg-blue-500'
  },
  {
    color: 'yellow',
    styles: 'bg-yellow-500'
  },
  {
    color: 'teal',
    styles: 'bg-teal-500'
  },
  {
    color: 'pink',
    styles: 'bg-pink-500'
  },
  {
    color: 'cyan',
    styles: 'bg-cyan-500'
  },
  {
    color: 'indigo',
    styles: 'bg-indigo-500'
  },
  {
    color: 'lime',
    styles: 'bg-lime-500'
  },
  {
    color: 'rose',
    styles: 'bg-rose-500'
  },
  {
    color: 'amber',
    styles: 'bg-amber-500'
  },
  {
    color: 'sky',
    styles: 'bg-sky-500'
  },
  {
    color: 'slate',
    styles: 'bg-slate-500'
  }
]

export type Icon = {
  name: string
  component: LucideIcon
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
    { name: 'Settings', component: Settings },
    { name: 'Star', component: Star },
    { name: 'Heart', component: Heart },
    { name: 'Plus', component: Plus },
    { name: 'Minus', component: Minus },
    { name: 'Check', component: Check },
    { name: 'X', component: X },
    { name: 'Search', component: Search },
    { name: 'Brain', component: Brain },
    { name: 'Users', component: Users },
    { name: 'Dumbbell', component: Dumbbell },
    { name: 'Gamepad2', component: Gamepad2 }
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
    { name: 'Navigation', component: Navigation },
    { name: 'Car', component: Car },
    { name: 'Plane', component: Plane },
    { name: 'Train', component: Train },
    { name: 'Bike', component: Bike }
  ],
  media: [
    { name: 'Play', component: Play },
    { name: 'Pause', component: Pause },
    { name: 'SkipForward', component: SkipForward },
    { name: 'SkipBack', component: SkipBack },
    { name: 'Repeat', component: Repeat },
    { name: 'Shuffle', component: Shuffle },
    { name: 'Volume2', component: Volume2 },
    { name: 'Camera', component: Camera },
    { name: 'Mic', component: Mic },
    { name: 'Image', component: Image },
    { name: 'Video', component: Video },
    { name: 'Music', component: Music }
  ],
  communication: [
    { name: 'Mail', component: Mail },
    { name: 'Phone', component: Phone },
    { name: 'MessageCircle', component: MessageCircle },
    { name: 'Send', component: Send },
    { name: 'Bell', component: Bell },
    { name: 'Share', component: Share },
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
    { name: 'Banknote', component: Banknote },
    { name: 'Calendar', component: Calendar },
    { name: 'Clock', component: Clock },
    { name: 'ShoppingCart', component: ShoppingCart },
    { name: 'CreditCard', component: CreditCard },
    { name: 'DollarSign', component: DollarSign },
    { name: 'Gift', component: Gift },
    { name: 'Award', component: Award },
    { name: 'Trophy', component: Trophy },
    { name: 'Target', component: Target },
    { name: 'Flag', component: Flag },
    { name: 'Bookmark', component: Bookmark },
    { name: 'Tag', component: Tag },
    { name: 'BriefcaseBusiness', component: BriefcaseBusiness }
  ],
  security: [
    { name: 'Lock', component: Lock },
    { name: 'Unlock', component: Unlock },
    { name: 'Eye', component: Eye },
    { name: 'EyeOff', component: EyeOff },
    { name: 'Shield', component: Shield },
    { name: 'Key', component: Key }
  ],
  interface: [
    { name: 'Menu', component: Menu },
    { name: 'MoreHorizontal', component: MoreHorizontal },
    { name: 'MoreVertical', component: MoreVertical },
    { name: 'Grid', component: Grid },
    { name: 'List', component: List },
    { name: 'Filter', component: Filter },
    { name: 'ArrowUpDown', component: ArrowUpDown },
    { name: 'RefreshCw', component: RefreshCw },
    { name: 'RotateCcw', component: RotateCcw },
    { name: 'ZoomIn', component: ZoomIn },
    { name: 'ZoomOut', component: ZoomOut },
    { name: 'Move', component: Move },
    { name: 'Maximize', component: Maximize },
    { name: 'Minimize', component: Minimize },
    { name: 'Info', component: Info },
    { name: 'AlertCircle', component: AlertCircle },
    { name: 'CheckCircle', component: CheckCircle },
    { name: 'XCircle', component: XCircle },
    { name: 'HelpCircle', component: HelpCircle }
  ],
  weather: [
    { name: 'Sun', component: Sun },
    { name: 'Moon', component: Moon },
    { name: 'Cloud', component: Cloud },
    { name: 'CloudRain', component: CloudRain },
    { name: 'Zap', component: Zap },
    { name: 'Flame', component: Flame },
    { name: 'Snowflake', component: Snowflake },
    { name: 'Droplets', component: Droplets },
    { name: 'Wind', component: Wind },
    { name: 'Thermometer', component: Thermometer },
    { name: 'Sunrise', component: Sunrise },
    { name: 'Sunset', component: Sunset },
    { name: 'Wifi', component: Wifi },
    { name: 'Battery', component: Battery },
    { name: 'Signal', component: Signal },
    { name: 'Globe', component: Globe }
  ]
}

export const allIcons: Icon[] = Object.values(iconCollection).flat()

export const areaStyles = [
  {
    color: 'green',
    styles:
      'text-green-600 border-green-600 bg-green-100 hover:text-green-700 hover:border-green-700 hover:bg-green-200'
  },
  {
    color: 'purple',
    styles:
      'text-purple-600 border-purple-600 bg-purple-100 hover:text-purple-700 hover:border-purple-700 hover:bg-purple-200'
  },
  {
    color: 'orange',
    styles:
      'text-orange-600 border-orange-600 bg-orange-100 hover:text-orange-700 hover:border-orange-700 hover:bg-orange-200'
  },
  {
    color: 'red',
    styles: 'text-red-600 border-red-600 bg-red-100 hover:text-red-700 hover:border-red-700 hover:bg-red-200'
  },
  {
    color: 'blue',
    styles: 'text-blue-600 border-blue-600 bg-blue-100 hover:text-blue-700 hover:border-blue-700 hover:bg-blue-200'
  },
  {
    color: 'yellow',
    styles:
      'text-yellow-600 border-yellow-600 bg-yellow-100 hover:text-yellow-700 hover:border-yellow-700 hover:bg-yellow-200'
  },
  {
    color: 'teal',
    styles: 'text-teal-600 border-teal-600 bg-teal-100 hover:text-teal-700 hover:border-teal-700 hover:bg-teal-200'
  },
  {
    color: 'pink',
    styles: 'text-pink-600 border-pink-600 bg-pink-100 hover:text-pink-700 hover:border-pink-700 hover:bg-pink-200'
  },
  {
    color: 'cyan',
    styles: 'text-cyan-600 border-cyan-600 bg-cyan-100 hover:text-cyan-700 hover:border-cyan-700 hover:bg-cyan-200'
  },
  {
    color: 'indigo',
    styles:
      'text-indigo-600 border-indigo-600 bg-indigo-100 hover:text-indigo-700 hover:border-indigo-700 hover:bg-indigo-200'
  },
  {
    color: 'lime',
    styles: 'text-lime-600 border-lime-600 bg-lime-100 hover:text-lime-700 hover:border-lime-700 hover:bg-lime-200'
  },
  {
    color: 'rose',
    styles: 'text-rose-600 border-rose-600 bg-rose-100 hover:text-rose-700 hover:border-rose-700 hover:bg-rose-200'
  },
  {
    color: 'amber',
    styles:
      'text-amber-600 border-amber-600 bg-amber-100 hover:text-amber-700 hover:border-amber-700 hover:bg-amber-200'
  },
  {
    color: 'sky',
    styles: 'text-sky-600 border-sky-600 bg-sky-100 hover:text-sky-700 hover:border-sky-700 hover:bg-sky-200'
  },
  {
    color: 'slate',
    styles:
      'text-slate-600 border-slate-600 bg-slate-100 hover:text-slate-700 hover:border-slate-700 hover:bg-slate-200'
  }
]
