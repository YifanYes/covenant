import {
  SquareAlert as Alert,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Battery,
  Bell as Notification,
  Bookmark,
  Briefcase,
  Target as Bullseye,
  Bus,
  Calendar,
  Camera,
  Car,
  ShoppingCart as Cart,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Cancel as Close,
  AvatarSquareX as CloseBox,
  Cloud,
  Coins as Dollar,
  Copy,
  CreditCard,
  Delete as Trash,
  Download,
  PenSquare as Edit,
  Expand,
  ExternalLink,
  Eye,
  EyeOff as EyeClosed,
  File,
  Flag,
  Folder,
  Forward,
  Gamepad,
  Gift,
  Gps,
  Grid3x3 as Grid,
  Hand as Move,
  Heart,
  Home,
  Human as HumanRun,
  Image,
  InfoBox,
  Attachment as Paperclip,
  Sticker as Label,
  Link,
  Bulletlist as List,
  Lock,
  Unlock as LockOpen,
  Login,
  Mail,
  MapPin as Map,
  Menu,
  Message,
  Minus,
  Money,
  MoreHorizontal,
  MoreVertical,
  Music,
  Phone as Deskphone,
  Play,
  Plus,
  Radio as RadioHandheld,
  Reload,
  Repeat,
  Search,
  Shield,
  Shuffle,
  Settings2 as Sliders,
  SortVertical as Sort,
  Square as Pause,
  CloudSun as Sun,
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
} from 'pixelarticons/react'

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
    { name: 'Gamepad', component: Gamepad },
    { name: 'Visible', component: Eye }
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
    { name: 'Next', component: Forward },
    { name: 'Prev', component: ArrowLeft },
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
    { name: 'Link', component: Link },
    { name: 'ExternalLink', component: ExternalLink },
    { name: 'Paperclip', component: Paperclip }
  ],
  files: [
    { name: 'File', component: File },
    { name: 'Folder', component: Folder },
    { name: 'Download', component: Download },
    { name: 'Upload', component: Upload },
    { name: 'Save', component: Bookmark },
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
    { name: 'Collapse', component: ChevronUp },
    { name: 'InfoBox', component: InfoBox },
    { name: 'Alert', component: Alert },
    { name: 'Check', component: Check },
    { name: 'CloseBox', component: CloseBox }
  ],
  weather: [
    { name: 'Sun', component: Sun },
    { name: 'Cloud', component: Cloud },
    { name: 'Zap', component: Zap },
    { name: 'Wind', component: Wind },
    { name: 'Battery', component: Battery },
    { name: 'Map', component: Map }
  ]
}

export const allIcons: Icon[] = Object.values(iconCollection).flat()
