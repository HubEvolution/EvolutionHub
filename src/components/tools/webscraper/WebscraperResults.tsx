import type { ScrapingResult } from '@/types/webscraper';

interface WebscraperResultsProps {
  result: ScrapingResult;
  strings: {
    resultTitle: string;
  };
}

export function WebscraperResults({ result, strings }: WebscraperResultsProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{strings.resultTitle}</h2>

      {/* Title & Meta */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{result.title}</h3>
        {result.description && (
          <p className="mt-2 text-gray-600 dark:text-gray-300">{result.description}</p>
        )}
        {result.url && (
          <a
            href={result.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
          >
            {result.url}
          </a>
        )}
      </div>

      {/* Content */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <h4 className="mb-3 text-lg font-medium text-gray-900 dark:text-white">Content</h4>
        <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">{result.text}</p>
      </div>

      {/* Metadata */}
      {result.metadata && Object.values(result.metadata).some((v) => v) && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <h4 className="mb-3 text-lg font-medium text-gray-900 dark:text-white">Metadata</h4>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {result.metadata.author && (
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Author</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                  {result.metadata.author}
                </dd>
              </div>
            )}
            {result.metadata.publishDate && (
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Published</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                  {new Date(result.metadata.publishDate).toLocaleDateString()}
                </dd>
              </div>
            )}
            {result.metadata.language && (
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Language</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                  {result.metadata.language}
                </dd>
              </div>
            )}
            {result.metadata.ogImage && (
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">OG Image</dt>
                <dd className="mt-1">
                  <img
                    src={result.metadata.ogImage}
                    alt="Open Graph"
                    className="h-32 rounded-md object-cover"
                  />
                </dd>
              </div>
            )}
          </dl>
        </div>
      )}

      {/* Links */}
      {result.links && result.links.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <h4 className="mb-3 text-lg font-medium text-gray-900 dark:text-white">
            Links ({result.links.length})
          </h4>
          <ul className="space-y-1">
            {result.links.slice(0, 20).map((link, idx) => (
              <li key={idx}>
                <a
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                >
                  {link.length > 80 ? link.slice(0, 80) + '...' : link}
                </a>
              </li>
            ))}
            {result.links.length > 20 && (
              <li className="text-sm text-gray-500">+ {result.links.length - 20} more links</li>
            )}
          </ul>
        </div>
      )}

      {/* Images */}
      {result.images && result.images.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <h4 className="mb-3 text-lg font-medium text-gray-900 dark:text-white">
            Images ({result.images.length})
          </h4>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {result.images.slice(0, 12).map((img, idx) => (
              <div key={idx} className="relative aspect-square">
                <img
                  src={img}
                  alt={`Image ${idx + 1}`}
                  className="h-full w-full rounded-md object-cover"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
          {result.images.length > 12 && (
            <p className="mt-2 text-sm text-gray-500">+ {result.images.length - 12} more images</p>
          )}
        </div>
      )}
    </div>
  );
}
