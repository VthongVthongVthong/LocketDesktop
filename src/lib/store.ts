import { Store } from '@tauri-apps/plugin-store';

let _store: Store | null = null;

async function getStore(): Promise<Store> {
    if (!_store) {
        _store = await Store.load('locket-widget.json');
    }
    return _store;
}

export async function storeGet<T>(key: string): Promise<T | null> {
    const store = await getStore();
    return (await store.get<T>(key)) ?? null;
}

export async function storeSet(key: string, value: unknown): Promise<void> {
    const store = await getStore();
    await store.set(key, value);
    await store.save();
}

export async function storeDelete(key: string): Promise<void> {
    const store = await getStore();
    await store.delete(key);
    await store.save();
}

export async function storeDeleteMultiple(keys: string[]): Promise<void> {
    const store = await getStore();
    for (const key of keys) {
        await store.delete(key);
    }
    await store.save();
}
