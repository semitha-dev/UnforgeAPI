'use client';

import React from 'react';
import * as LucideIcons from 'lucide-react';

type IconVariant = 'outline' | 'solid';

interface IconProps {
    name: string;
    variant?: IconVariant;
    size?: number;
    className?: string;
    onClick?: () => void;
    disabled?: boolean;
    [key: string]: any;
}

// Map common HeroIcon names to Lucide equivalents
const iconNameMap: Record<string, string> = {
    'AcademicCapIcon': 'GraduationCap',
    'ArrowRightIcon': 'ArrowRight',
    'ArrowLeftIcon': 'ArrowLeft',
    'BoltIcon': 'Zap',
    'BookOpenIcon': 'BookOpen',
    'CalendarIcon': 'Calendar',
    'CheckIcon': 'Check',
    'CheckCircleIcon': 'CheckCircle',
    'ChevronDownIcon': 'ChevronDown',
    'ChevronUpIcon': 'ChevronUp',
    'ChevronRightIcon': 'ChevronRight',
    'ChevronLeftIcon': 'ChevronLeft',
    'ClockIcon': 'Clock',
    'DocumentTextIcon': 'FileText',
    'ExclamationCircleIcon': 'AlertCircle',
    'FireIcon': 'Flame',
    'GiftIcon': 'Gift',
    'HeartIcon': 'Heart',
    'LightBulbIcon': 'Lightbulb',
    'MinusIcon': 'Minus',
    'PaperAirplaneIcon': 'Send',
    'PlayIcon': 'Play',
    'PlusIcon': 'Plus',
    'QuestionMarkCircleIcon': 'HelpCircle',
    'RocketLaunchIcon': 'Rocket',
    'SparklesIcon': 'Sparkles',
    'StarIcon': 'Star',
    'UserIcon': 'User',
    'UsersIcon': 'Users',
    'XMarkIcon': 'X',
    'Bars3Icon': 'Menu',
    'XCircleIcon': 'XCircle',
    'InformationCircleIcon': 'Info',
    'CogIcon': 'Settings',
    'CreditCardIcon': 'CreditCard',
    'ShieldCheckIcon': 'ShieldCheck',
    'TrophyIcon': 'Trophy',
    'PresentationChartLineIcon': 'LineChart',
    'ChatBubbleLeftRightIcon': 'MessageSquare',
    'EnvelopeIcon': 'Mail',
    'PhoneIcon': 'Phone',
    'MapPinIcon': 'MapPin',
    'GlobeAltIcon': 'Globe',
    'MagnifyingGlassIcon': 'Search',
    'PencilIcon': 'Pencil',
    'TrashIcon': 'Trash',
    'EyeIcon': 'Eye',
    'EyeSlashIcon': 'EyeOff',
    'LockClosedIcon': 'Lock',
    'LockOpenIcon': 'Unlock',
    'ArrowDownTrayIcon': 'Download',
    'ArrowUpTrayIcon': 'Upload',
    'ShareIcon': 'Share2',
    'LinkIcon': 'Link',
    'ClipboardIcon': 'Clipboard',
    'FolderIcon': 'Folder',
    'HomeIcon': 'Home',
    'BellIcon': 'Bell',
    'BrainIcon': 'Brain',
    'ZapIcon': 'Zap',
    'TargetIcon': 'Target',
    'AwardIcon': 'Award',
    'BookIcon': 'Book',
    'LayersIcon': 'Layers',
};

function Icon({
    name,
    variant = 'outline',
    size = 24,
    className = '',
    onClick,
    disabled = false,
    ...props
}: IconProps) {
    // Try to map the name to a Lucide icon
    let lucideIconName = iconNameMap[name] || name.replace('Icon', '');
    
    // Get the icon component from Lucide
    const IconComponent = (LucideIcons as any)[lucideIconName] || LucideIcons.HelpCircle;

    return (
        <IconComponent
            width={size}
            height={size}
            className={`${disabled ? 'opacity-50 cursor-not-allowed' : onClick ? 'cursor-pointer hover:opacity-80' : ''} ${className}`}
            onClick={disabled ? undefined : onClick}
            strokeWidth={variant === 'solid' ? 2.5 : 1.5}
            {...props}
        />
    );
}

export default Icon;
