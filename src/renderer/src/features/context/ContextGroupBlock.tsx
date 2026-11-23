import { Plus } from 'lucide-react';
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
      </div>
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
