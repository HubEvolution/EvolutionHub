import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import ToolDetailsModal from '@/components/tools/ToolDetailsModal';
import type { ToolModalContent } from '@/lib/tools-data';

export interface ToolDetails {
  id: string;
  name: string;
  description: string;
  localizedUrl: string;
  modal?: ToolModalContent;
}

export interface ToolModalLabels {
  close: string;
  featuresHeading: string;
  direct: string;
}

interface ToolsIndexIslandProps {
  tools: ToolDetails[];
  labels: ToolModalLabels;
}

function useModalState(tools: ToolDetails[]) {
  const [openId, setOpenId] = useState<string | null>(null);

  const activeTool = useMemo(() => {
    if (!openId) return null;
    return tools.find((tool) => tool.id === openId) ?? null;
  }, [openId, tools]);

  useEffect(() => {
    const handler = (event: Event) => {
      const trigger = (event.target as HTMLElement | null)?.closest('[data-tool-modal-trigger]');
      if (!trigger) return;
      const id = trigger.getAttribute('data-tool-modal-trigger');
      if (!id) return;
      event.preventDefault();
      setOpenId(id);
    };

    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  return {
    activeTool,
    openId,
    setOpenId,
  };
}

export default function ToolsIndexIsland({ tools, labels }: ToolsIndexIslandProps) {
  const { activeTool, setOpenId } = useModalState(tools);

  useEffect(() => {
    const onHashOpen = () => {
      if (!window.location.hash) return;
      const hashId = window.location.hash.replace('#tool-', '');
      if (!hashId) return;
      const exists = tools.some((tool) => tool.id === hashId);
      if (exists) {
        setOpenId(hashId);
      }
    };

    onHashOpen();
    window.addEventListener('hashchange', onHashOpen);
    return () => window.removeEventListener('hashchange', onHashOpen);
  }, [tools, setOpenId]);

  const close = () => setOpenId(null);

  if (!activeTool) return null;

  return createPortal(
    <ToolDetailsModal open tool={activeTool} labels={labels} onClose={close} />,
    document.body
  );
}
