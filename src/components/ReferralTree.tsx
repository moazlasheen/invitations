import React, { useState } from 'react';
import { User, ChevronDown, ChevronRight, Users } from 'lucide-react';
import { QRCodeDisplay } from './QRCodeDisplay';
import { formatDate } from '../lib/utils';
import type { Referral } from '../types';

interface ReferralTreeNodeProps {
  referral: Referral;
  depth: number;
}

function ReferralTreeNode({ referral, depth }: ReferralTreeNodeProps) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = referral.children && referral.children.length > 0;

  return (
    <div className={depth > 0 ? 'ml-8' : ''}>
      <div className={`${depth > 0 ? 'tree-line' : ''}`}>
        <div
          className={`flex items-center gap-3 p-3 rounded-2xl hover:bg-ink-50 transition-colors group cursor-pointer ${
            !referral.accepted ? 'opacity-60' : ''
          }`}
          onClick={() => hasChildren && setExpanded(!expanded)}
        >
          {/* Expand toggle */}
          <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
            {hasChildren ? (
              expanded ? (
                <ChevronDown size={16} className="text-ink-400" />
              ) : (
                <ChevronRight size={16} className="text-ink-400" />
              )
            ) : (
              <div className="w-1.5 h-1.5 rounded-full bg-ink-300" />
            )}
          </div>

          {/* Avatar */}
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
              referral.accepted ? 'bg-brand-50 text-brand-500' : 'bg-ink-100 text-ink-400'
            }`}
          >
            <User size={16} />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-ink-900 truncate">
              {referral.referrer_name || 'Anonymous'}
            </p>
            <p className="text-xs text-ink-500">
              {referral.accepted ? 'Accepted' : 'Pending'} · {formatDate(referral.created_at)}
            </p>
          </div>

          {/* Children count */}
          {hasChildren && (
            <div className="flex items-center gap-1 px-2 py-1 bg-ink-100 rounded-lg">
              <Users size={12} className="text-ink-500" />
              <span className="text-xs font-medium text-ink-600">{referral.children!.length}</span>
            </div>
          )}

          {/* QR compact */}
          <div className="hidden group-hover:block">
            <QRCodeDisplay code={referral.referral_code} compact />
          </div>
        </div>
      </div>

      {/* Children */}
      {expanded && hasChildren && (
        <div className="mt-1">
          {referral.children!.map((child) => (
            <ReferralTreeNode key={child.id} referral={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

interface ReferralTreeProps {
  referrals: Referral[];
}

export function ReferralTree({ referrals }: ReferralTreeProps) {
  if (referrals.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-ink-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Users size={24} className="text-ink-400" />
        </div>
        <p className="text-ink-600 font-medium mb-1">No referrals yet</p>
        <p className="text-ink-400 text-sm">Share your referral link to start growing your tree.</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {referrals.map((referral) => (
        <ReferralTreeNode key={referral.id} referral={referral} depth={0} />
      ))}
    </div>
  );
}
