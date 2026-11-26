import React from 'react';
import { CampaignManagerModal } from './CampaignManagerModal';
import { ElementModelDetailsModal } from './ElementModelDetailsModal';
import { PostCreatorModelModal } from './PostCreatorModelModal';
import type { ElementModel, ElementType, PostCampaign } from '../types/postCreator';

interface PostEditorModalsProps {
  managerOpen: boolean;
  campaigns: PostCampaign[];
  creating?: { type: ElementType; opportunityId?: string };
  editing?: ElementModel;
  viewing?: ElementModel;
  opportunities: any[];
  onCloseManager: () => void;
  onSaveCampaign: (value: Partial<PostCampaign>) => Promise<void>;
  onRemoveCampaign: (id: string) => Promise<void>;
  onCloseCreating: () => void;
  onCreateModel: (model: ElementModel) => Promise<void>;
  onCloseEditing: () => void;
  onUpdateModel: (model: ElementModel) => Promise<void>;
  onCloseViewing: () => void;
  onSavingChange: (isSaving: boolean) => void;
}

export const PostEditorModals: React.FC<PostEditorModalsProps> = ({
  managerOpen,
  campaigns,
  creating,
  editing,
  viewing,
  opportunities,
  onCloseManager,
  onSaveCampaign,
  onRemoveCampaign,
  onCloseCreating,
  onCreateModel,
  onCloseEditing,
  onUpdateModel,
  onCloseViewing,
  onSavingChange,
}) => (
  <>
    {managerOpen && (
      <CampaignManagerModal
        campaigns={campaigns}
        onClose={onCloseManager}
        onSave={onSaveCampaign}
        onRemove={onRemoveCampaign}
        onSavingChange={onSavingChange}
      />
    )}
    {creating && (
      <PostCreatorModelModal
        elementType={creating.type}
        initialOpportunityId={creating.opportunityId}
        opportunities={opportunities}
        onClose={onCloseCreating}
        onSave={onCreateModel}
        onSavingChange={onSavingChange}
      />
    )}
    {editing && (
      <PostCreatorModelModal
        elementType={editing.elementType}
        value={editing}
        opportunities={opportunities}
        onClose={onCloseEditing}
        onSave={onUpdateModel}
        onSavingChange={onSavingChange}
      />
    )}
    {viewing && (
      <ElementModelDetailsModal model={viewing} onClose={onCloseViewing} />
    )}
  </>
);
