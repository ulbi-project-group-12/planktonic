'use client';

async function save(): Promise<void> {
  await Promise.resolve();
}

export default function Page() {
  return (
    <main>
      <h1>Settings</h1>
      <button
        type="button"
        onClick={async () => {
          await save();
        }}
      >
        Save
      </button>
    </main>
  );
}
