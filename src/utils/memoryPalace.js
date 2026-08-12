/**
 * Memory Palace data layer — fetches/creates the user's palace,
 * handles room CRUD, item placement, purchases, and note edits.
 *
 * Coins for purchases come out of the same GamificationProfile balance
 * used everywhere else (avatar shop, etc.).
 */

import { base44 } from '@/api/base44Client';
import {
  getCatalogItem,
  getDefaultOwnedCatalogIds,
  ROOM_SLOT_COST,
  MAX_ROOMS,
} from '@/data/memoryPalaceCatalog';
import { getOrCreateGamificationProfile } from '@/utils/gamification';

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────
const uid = () => `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

function defaultRoom(name = 'My First Room') {
  return {
    id: uid(),
    name,
    subject: '',
    wallpaper: 'wp_cream',
    floor: 'fl_wood',
    grid_cols: 10,
    grid_rows: 8,
    pet_id: '',
    pet_x: 1,
    pet_y: 1,
    items: [],
  };
}

// ──────────────────────────────────────────────────────────────
// LOAD / CREATE
// ──────────────────────────────────────────────────────────────
export async function getOrCreatePalace(userId) {
  if (!userId) return null;
  const existing = await base44.entities.MemoryPalace.filter({ user_id: userId });
  if (existing[0]) return existing[0];
  const firstRoom = defaultRoom('My First Room');
  return await base44.entities.MemoryPalace.create({
    user_id: userId,
    rooms: [firstRoom],
    active_room_id: firstRoom.id,
    owned_catalog_ids: getDefaultOwnedCatalogIds(),
    custom_uploads: [],
  });
}

// ──────────────────────────────────────────────────────────────
// ROOM MANAGEMENT
// ──────────────────────────────────────────────────────────────
export async function addRoom(palace, name) {
  if ((palace.rooms || []).length >= MAX_ROOMS) {
    throw new Error(`Maximum ${MAX_ROOMS} rooms reached`);
  }
  const profile = await getOrCreateGamificationProfile(palace.user_id);
  if ((profile.coins || 0) < ROOM_SLOT_COST) {
    throw new Error(`You need 🪙 ${ROOM_SLOT_COST} coins to add a new room`);
  }
  await base44.entities.GamificationProfile.update(profile.id, {
    coins: profile.coins - ROOM_SLOT_COST,
  });
  const room = defaultRoom(name || `Room ${(palace.rooms?.length || 0) + 1}`);
  const rooms = [...(palace.rooms || []), room];
  await base44.entities.MemoryPalace.update(palace.id, {
    rooms,
    active_room_id: room.id,
  });
  return room.id;
}

export async function deleteRoom(palace, roomId) {
  const rooms = (palace.rooms || []).filter(r => r.id !== roomId);
  if (rooms.length === 0) {
    throw new Error('You must keep at least one room');
  }
  const active = palace.active_room_id === roomId ? rooms[0].id : palace.active_room_id;
  await base44.entities.MemoryPalace.update(palace.id, { rooms, active_room_id: active });
}

export async function renameRoom(palace, roomId, name, subject) {
  const rooms = (palace.rooms || []).map(r =>
    r.id === roomId ? { ...r, name, subject: subject ?? r.subject } : r
  );
  await base44.entities.MemoryPalace.update(palace.id, { rooms });
}

export async function setActiveRoom(palace, roomId) {
  await base44.entities.MemoryPalace.update(palace.id, { active_room_id: roomId });
}

export async function setRoomTheme(palace, roomId, { wallpaper, floor }) {
  const rooms = (palace.rooms || []).map(r =>
    r.id === roomId ? {
      ...r,
      ...(wallpaper !== undefined ? { wallpaper } : {}),
      ...(floor !== undefined ? { floor } : {}),
    } : r
  );
  await base44.entities.MemoryPalace.update(palace.id, { rooms });
}

// ──────────────────────────────────────────────────────────────
// SHOP — purchase from the palace catalog
// ──────────────────────────────────────────────────────────────
export async function purchaseCatalogItem(palace, catalogId) {
  const item = getCatalogItem(catalogId);
  if (!item) throw new Error('Item not found');
  if ((palace.owned_catalog_ids || []).includes(catalogId)) {
    throw new Error('Already owned');
  }
  const profile = await getOrCreateGamificationProfile(palace.user_id);
  if ((profile.coins || 0) < (item.cost || 0)) {
    throw new Error(`Not enough coins (need 🪙 ${item.cost})`);
  }
  await base44.entities.GamificationProfile.update(profile.id, {
    coins: profile.coins - item.cost,
  });
  const owned = [...(palace.owned_catalog_ids || []), catalogId];
  await base44.entities.MemoryPalace.update(palace.id, { owned_catalog_ids: owned });
  return owned;
}

// ──────────────────────────────────────────────────────────────
// CUSTOM UPLOADS — user uploads their own SVG/PNG decoration
// ──────────────────────────────────────────────────────────────
export async function addCustomUpload(palace, label, url) {
  const upload = { id: `cu_${uid()}`, label: label || 'Custom Item', url };
  const uploads = [...(palace.custom_uploads || []), upload];
  await base44.entities.MemoryPalace.update(palace.id, { custom_uploads: uploads });
  return upload;
}

// ──────────────────────────────────────────────────────────────
// ROOM ITEM PLACEMENT
// ──────────────────────────────────────────────────────────────
function updateRoom(palace, roomId, transform) {
  return (palace.rooms || []).map(r => (r.id === roomId ? transform(r) : r));
}

export async function placeItem(palace, roomId, catalogId, x, y, customUrl = null) {
  const item = {
    instance_id: uid(),
    catalog_id: catalogId,
    custom_url: customUrl || '',
    x,
    y,
    rotation: 0,
    note: { type: 'concept', title: '', front: '', back: '', example: '', tags: [], color: '#fef3c7' },
  };
  const rooms = updateRoom(palace, roomId, r => ({ ...r, items: [...(r.items || []), item] }));
  await base44.entities.MemoryPalace.update(palace.id, { rooms });
  return item.instance_id;
}

export async function moveItem(palace, roomId, instanceId, x, y) {
  const rooms = updateRoom(palace, roomId, r => ({
    ...r,
    items: (r.items || []).map(i => (i.instance_id === instanceId ? { ...i, x, y } : i)),
  }));
  await base44.entities.MemoryPalace.update(palace.id, { rooms });
}

export async function removeItem(palace, roomId, instanceId) {
  const rooms = updateRoom(palace, roomId, r => ({
    ...r,
    items: (r.items || []).filter(i => i.instance_id !== instanceId),
  }));
  await base44.entities.MemoryPalace.update(palace.id, { rooms });
}

export async function updateItemNote(palace, roomId, instanceId, note) {
  const rooms = updateRoom(palace, roomId, r => ({
    ...r,
    items: (r.items || []).map(i => (i.instance_id === instanceId ? { ...i, note: { ...i.note, ...note } } : i)),
  }));
  await base44.entities.MemoryPalace.update(palace.id, { rooms });
}

// ──────────────────────────────────────────────────────────────
// PETS
// ──────────────────────────────────────────────────────────────
export async function setRoomPet(palace, roomId, petId) {
  const rooms = updateRoom(palace, roomId, r => ({ ...r, pet_id: petId }));
  await base44.entities.MemoryPalace.update(palace.id, { rooms });
}
