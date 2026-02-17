import React, { useEffect, useState, useRef } from 'react';
import { Node, Edge } from '@xyflow/react';
import { useTheme } from '@mui/material';

type ProjectThumbnailProps = {
  nodes: Node[];
  edges: Edge[];
  projectId: string;
};

export const ProjectThumbnail = ({ projectId }: ProjectThumbnailProps) => {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const theme = useTheme();

  useEffect(() => {
    const cachedData = localStorage.getItem(`project-thumbnail-${projectId}`);

    if (cachedData) {
      try {
        const { dataUrl } = JSON.parse(cachedData);
        setThumbnailUrl(dataUrl);
      } catch (error) {
        console.error('Failed to parse cached thumbnail:', error);
      }
    }
  }, [projectId]);

  return (
    <div
      ref={wrapperRef}
      style={{
        width: '100%',
        height: 180,
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
        overflow: 'hidden',
        backgroundColor: theme.palette.background.default,
        pointerEvents: 'none',
      }}
    >
      {thumbnailUrl && (
        <img
          src={thumbnailUrl}
          alt="Project thumbnail"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      )}
    </div>
  );
};
