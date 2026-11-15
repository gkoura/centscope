import {
    Repeat2,
    CalendarDays,
    Clock,
    Folder,
    Circle,
    Star,
    Heart,
    Users,
    Flag,
    CircleCheck,
    ArrowLeftRight,
    Ellipsis,
    Tag,
    Utensils,
    Coffee,
    House,
    Car,
    Bus,
    ShoppingBag,
    ShoppingCart,
    HeartPulse,
    Pill,
    Ticket,
    Gamepad2,
    Plane,
    Gift,
    GraduationCap,
    Baby,
    PawPrint,
    Dumbbell,
    Briefcase,
    Wallet,
    Landmark,
    ChartNoAxesCombined,
    Smartphone,
    Wifi,
    Zap,
    Wrench,
    Scissors,
    Music,
    Layers,
    type LucideIcon,
} from "lucide-react"
import { resolveCategoryIcon, type CategoryIconKey } from "@/lib/category-icons"
import { cn } from "@/lib/utils"
const icons: Record<CategoryIconKey, LucideIcon> = {
    repeat: Repeat2,
    calendar: CalendarDays,
    clock: Clock,
    folder: Folder,
    circle: Circle,
    star: Star,
    heart: Heart,
    users: Users,
    flag: Flag,
    "circle-check": CircleCheck,
    "arrow-left-right": ArrowLeftRight,
    ellipsis: Ellipsis,
    tag: Tag,
    utensils: Utensils,
    coffee: Coffee,
    house: House,
    car: Car,
    bus: Bus,
    "shopping-bag": ShoppingBag,
    "shopping-cart": ShoppingCart,
    "heart-pulse": HeartPulse,
    pill: Pill,
    ticket: Ticket,
    gamepad: Gamepad2,
    plane: Plane,
    gift: Gift,
    "graduation-cap": GraduationCap,
    baby: Baby,
    "paw-print": PawPrint,
    dumbbell: Dumbbell,
    briefcase: Briefcase,
    wallet: Wallet,
    landmark: Landmark,
    "chart-no-axes-combined": ChartNoAxesCombined,
    smartphone: Smartphone,
    wifi: Wifi,
    zap: Zap,
    wrench: Wrench,
    scissors: Scissors,
    music: Music,
}
export function CategoryIcon({
    iconKey,
    parentIconKey,
    multiple = false,
    className,
}: {
    iconKey?: string | null
    parentIconKey?: string | null
    multiple?: boolean
    className?: string
}) {
    const Icon = multiple
        ? Layers
        : icons[resolveCategoryIcon(iconKey, parentIconKey)]
    return (
        <Icon
            aria-hidden="true"
            focusable="false"
            className={cn("size-4 shrink-0 text-muted-foreground", className)}
        />
    )
}
