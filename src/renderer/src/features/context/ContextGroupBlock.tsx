import { Eraser, Plus } from 'lucide-react';
import { NetworkEditor } from '../capture/NetworkEditor';
import { useNetwork } from '../capture/NetworkProvider';
import { useScreenshots } from '../screenshots/ScreenshotsProvider';
import { GroupToggle, NoteEditor, ScreenshotTextEditor } from './ContextItemEditors';
import { useContextReview } from './ContextReviewProvider';
import type { ContextGroup } from './context-model';
import { usePageContent } from './PageContentProvider';
import { PageEditor } from './PageEditor';

/** One source group in the review: a heading with an include-all box, then its items. */
export function ContextGroupBlock({ group }: { group: ContextGroup }) {
  const { screenshots, ocr, editText, restoreText } = useScreenshots();
  const { pages, editPage, restorePage, removePage } = usePageContent();
  const { setIncluded, addNote, editNote, removeNote } = useContextReview();
  const network = useNetwork();
  const ids = group.items.map((item) => item.id);
  const includedCount = group.items.filter((item) => item.included).length;

  return (
    <section className="context-group" aria-label={group.label}>
      <div className="section-head">
        <h2>{group.label}</h2>
        {group.items.length > 0 && (
          <GroupToggle
            includedCount={includedCount}
            total={group.items.length}
            label={group.label}
            onChange={(included) => setIncluded(ids, included)}
          />
        )}
        {group.source === 'note' && (
          <button type="button" className="btn btn-plain" onClick={addNote}>
            <Plus size={14} strokeWidth={2.2} aria-hidden="true" />
            Add note
          </button>
        )}
        {group.source === 'network' && (
          <button
            type="button"
            className="btn btn-plain is-destructive"
            onClick={network.clear}
            title="Remove every recorded response"
          >
            <Eraser size={14} aria-hidden="true" />
            Clear all
          </button>
        )}
      </div>
      {group.source === 'network' && (
        <p className="section-hint">
          Responses start left out. Switch on the ones that matter; each is pruned to its shape (a
          few sample items, short strings) so the package stays small.
        </p>
      )}
      {group.source === 'note' && group.items.length === 0 && (
        <p className="section-hint">
          Tell the AI what you want, such as a question or a goal. Notes go first in the package.
        </p>
      )}
      <ol className="text-editor-list">
        {group.items.map((item, index) => {
          const toggle = (included: boolean) => setIncluded([item.id], included);
          if (item.source === 'note') {
            return (
              <NoteEditor
                key={item.id}
                note={item.note}
                position={index + 1}
                included={item.included}
                onToggle={toggle}
                onEdit={(text) => editNote(item.note.id, text)}
                onRemove={() => removeNote(item.note.id)}
              />
            );
          }
          if (item.source === 'screenshot') {
            const storeId = item.id.slice('screenshot:'.length);
            const screenshot = screenshots.find((shot) => shot.id === storeId);
            if (!screenshot) return null;
            return (
              <ScreenshotTextEditor
                key={item.id}
                screenshot={screenshot}
                entry={ocr[storeId]}
                position={index + 1}
                included={item.included}
                onToggle={toggle}
                onEdit={editText}
                onRestore={restoreText}
              />
            );
          }
          if (item.source === 'network') {
            const storeId = item.id.slice('network:'.length);
            const entry = network.network.entries.find((candidate) => candidate.id === storeId);
            if (!entry) return null;
            return (
              <NetworkEditor
                key={item.id}
                entry={entry}
                text={network.textOf(entry)}
                position={index + 1}
                included={item.included}
                onToggle={toggle}
                onEdit={(text) => network.edit(entry.id, entry.text, text)}
                onRestore={() => network.restore(entry.id)}
                onRemove={() => network.remove(entry.id)}
              />
            );
          }
          const storeId = item.id.slice('page:'.length);
          const page = pages.find((entry) => entry.id === storeId);
          if (!page) return null;
          return (
            <PageEditor
              key={item.id}
              page={page}
              position={index + 1}
              included={item.included}
              onToggle={toggle}
              onEdit={editPage}
              onRestore={restorePage}
              onRemove={removePage}
            />
          );
        })}
      </ol>
    </section>
  );
}
