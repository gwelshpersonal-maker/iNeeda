import React from 'react';
import { BadgeType } from '../types';
import { BADGE_GROUPS } from '../constants';
import { ShieldCheck, Award, Star, Heart, FileCheck, MapPin, Zap, Repeat, CheckCircle2, ShieldAlert, Dog } from 'lucide-react';

interface BadgeDisplayProps {
    badges?: BadgeType[];
    size?: 'sm' | 'md';
}

const getBadgeIcon = (badgeId: BadgeType, className: string) => {
    switch (badgeId) {
        case 'IDENTITY_VERIFIED': return <ShieldCheck className={className} />;
        case 'BACKGROUND_CHECKED': return <FileCheck className={className} />;
        case '717_LOCAL': return <MapPin className={className} />;
        case 'INSURED_PRO': return <ShieldCheck className={className} />;
        case 'LICENSED_SPECIALIST': return <Award className={className} />;
        case 'CLEAN_SLATE': return <CheckCircle2 className={className} />;
        case 'FAST_RESPONDER': return <Zap className={className} />;
        case 'REPEAT_GUY': return <Repeat className={className} />;
        case 'TOP_RATED': return <Star className={className} />;
        case 'CHILD_SAFETY_CLEARED': return <Heart className={className} />;
        case 'PET_FRIENDLY': return <Dog className={className} />;
        default: return <Award className={className} />;
    }
};

const getBadgeColor = (groupName: string) => {
    switch (groupName) {
        case 'Trust': return 'bg-blue-50 text-blue-700 border-blue-200';
        case 'Professional': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
        case 'Service': return 'bg-amber-50 text-amber-700 border-amber-200';
        case 'Safety': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
        default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
};

export const BadgeDisplay: React.FC<BadgeDisplayProps> = ({ badges, size = 'md' }) => {
    if (!badges || badges.length === 0) return null;

    // Flatten badges with their group info
    const badgeDetails = Object.entries(BADGE_GROUPS).flatMap(([groupName, groupBadges]) => 
        groupBadges
            .filter(b => badges.includes(b.id))
            .map(b => ({ ...b, groupName }))
    );

    if (badgeDetails.length === 0) return null;

    const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
    const textSize = size === 'sm' ? 'text-[10px]' : 'text-xs';
    const padding = size === 'sm' ? 'px-1.5 py-0.5' : 'px-2 py-1';

    return (
        <div className="flex flex-wrap gap-1.5 mt-2">
            {badgeDetails.map(badge => (
                <div 
                    key={badge.id} 
                    className={`flex items-center gap-1 border rounded-full font-bold ${padding} ${getBadgeColor(badge.groupName)}`}
                    title={badge.description}
                >
                    {getBadgeIcon(badge.id, iconSize)}
                    <span className={textSize}>{badge.label}</span>
                </div>
            ))}
        </div>
    );
};
