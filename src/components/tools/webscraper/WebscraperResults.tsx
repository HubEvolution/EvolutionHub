import { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import type { ScrapingResult } from '@/types/webscraper';

interface WebscraperResultsProps {
  result: ScrapingResult;
  strings: {
    resultTitle: string;
  };
}

export function WebscraperResults({ result, strings }: WebscraperResultsProps) {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState({
    metadata: true,
    content: true,
    links: false,
    images: false,
  });

  const handleCopy = async (text: string, section: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSection(section);
      setTimeout(() => setCopiedSection(null), 2000);
    } catch {
      // no-op
    }
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return null;
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{strings.resultTitle}</h2>
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          {new Date(result.scrapedAt).toLocaleString()}
        </div>
      </div>

      {/* Title & Meta Card */}
      <Card variant="holo" className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-3">
              {result.metadata?.ogImage && (
                <img
                  src={result.metadata.ogImage}
                  alt="Preview"
                  className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                  loading="lazy"
                />
              )}
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white truncate">
                  {result.title}
                </h3>
                {result.metadata?.author && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    By {result.metadata.author}
                  </p>
                )}
              </div>
            </div>
            {result.description && (
              <p className="text-gray-600 dark:text-gray-300 mt-2">{result.description}</p>
            )}
            {result.url && (
              <a
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
                View original page
              </a>
            )}
          </div>
          <Button
            onClick={() => handleCopy(result.title, 'title')}
            variant="secondary"
            size="sm"
            className="flex-shrink-0"
          >
            {copiedSection === 'title' ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            )}
          </Button>
        </div>

        {/* Robots.txt Status */}
        {!result.robotsTxtAllowed && (
          <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-center gap-2 text-sm text-yellow-800 dark:text-yellow-200">
              <svg
                className="w-5 h-5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <span>robots.txt would block automated scraping of this page</span>
            </div>
          </div>
        )}
      </Card>

      {/* Metadata */}
      {result.metadata && Object.values(result.metadata).some((v) => v) && (
        <Card variant="holo" className="p-6">
          <button
            onClick={() => toggleSection('metadata')}
            className="flex items-center justify-between w-full text-left"
          >
            <h4 className="text-lg font-medium text-gray-900 dark:text-white">Metadata</h4>
            <svg
              className={`w-5 h-5 text-gray-500 transition-transform ${expandedSections.metadata ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          {expandedSections.metadata && (
            <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {result.metadata.publishDate && (
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Published
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                    {formatDate(result.metadata.publishDate)}
                  </dd>
                </div>
              )}
              {result.metadata.language && (
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Language
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white uppercase">
                    {result.metadata.language}
                  </dd>
                </div>
              )}
            </dl>
          )}
        </Card>
      )}

      {/* Content */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => toggleSection('content')}
            className="flex items-center gap-2 text-left"
          >
            <h4 className="text-lg font-medium text-gray-900 dark:text-white">Content</h4>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              ({result.text.length.toLocaleString()} characters)
            </span>
            <svg
              className={`w-5 h-5 text-gray-500 transition-transform ${expandedSections.content ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          <Button onClick={() => handleCopy(result.text, 'content')} variant="secondary" size="sm">
            {copiedSection === 'content' ? 'Copied!' : 'Copy'}
          </Button>
        </div>
        {expandedSections.content && (
          <div className="prose dark:prose-invert max-w-none">
            <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
              {result.text}
            </p>
          </div>
        )}
      </Card>

      {/* Links */}
      {result.links && result.links.length > 0 && (
        <Card variant="holo" className="p-6">
          <button
            onClick={() => toggleSection('links')}
            className="flex items-center justify-between w-full text-left"
          >
            <div className="flex items-center gap-2">
              <h4 className="text-lg font-medium text-gray-900 dark:text-white">Links</h4>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                {result.links.length}
              </span>
            </div>
            <svg
              className={`w-5 h-5 text-gray-500 transition-transform ${expandedSections.links ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          {expandedSections.links && (
            <ul className="mt-4 space-y-2 max-h-96 overflow-y-auto">
              {result.links.slice(0, 50).map((link, idx) => (
                <li
                  key={idx}
                  className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <svg
                    className="w-4 h-4 text-gray-400 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                    />
                  </svg>
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400 truncate flex-1"
                  >
                    {link.length > 100 ? link.slice(0, 100) + '...' : link}
                  </a>
                </li>
              ))}
              {result.links.length > 50 && (
                <li className="text-sm text-gray-500 dark:text-gray-400 text-center p-2">
                  + {result.links.length - 50} more links
                </li>
              )}
            </ul>
          )}
        </Card>
      )}

      {/* Images */}
      {result.images && result.images.length > 0 && (
        <Card variant="holo" className="p-6">
          <button
            onClick={() => toggleSection('images')}
            className="flex items-center justify-between w-full text-left"
          >
            <div className="flex items-center gap-2">
              <h4 className="text-lg font-medium text-gray-900 dark:text-white">Images</h4>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                {result.images.length}
              </span>
            </div>
            <svg
              className={`w-5 h-5 text-gray-500 transition-transform ${expandedSections.images ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          {expandedSections.images && (
            <div className="mt-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {result.images.slice(0, 16).map((img, idx) => (
                  <a
                    key={idx}
                    href={img}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative aspect-square group"
                  >
                    <img
                      src={img}
                      alt={`Image ${idx + 1}`}
                      className="h-full w-full rounded-lg object-cover transition-transform group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-lg transition-all flex items-center justify-center">
                      <svg
                        className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                    </div>
                  </a>
                ))}
              </div>
              {result.images.length > 16 && (
                <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                  + {result.images.length - 16} more images
                </p>
              )}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
