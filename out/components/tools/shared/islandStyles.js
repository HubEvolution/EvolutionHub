"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usageBarFillCls = exports.usageBarBgCls = exports.smallMutedTextCls = exports.mutedTextCls = exports.sectionTitleCls = exports.cardBodyCls = exports.cardVariant = exports.containerCls = void 0;
exports.containerCls = 'mx-auto max-w-4xl space-y-6';
exports.cardVariant = 'holo';
exports.cardBodyCls = 'p-6';
exports.sectionTitleCls = 'text-lg font-semibold mb-3';
exports.mutedTextCls = 'text-gray-600 dark:text-gray-300';
exports.smallMutedTextCls = 'text-sm text-gray-500 dark:text-gray-400';
exports.usageBarBgCls = 'w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2';
const usageBarFillCls = (percent) => {
    const p = Math.max(0, Math.min(100, Math.floor(percent)));
    const color = p > 80 ? 'bg-red-500' : p > 50 ? 'bg-yellow-500' : 'bg-blue-500';
    return `h-2 rounded-full transition-all duration-300 ${color}`;
};
exports.usageBarFillCls = usageBarFillCls;
