"use client";

import { useEffect, useState } from "react";

export const LIVE_CHAT_OPEN_STORAGE_KEY = "houselink_live_chat_open";
const LIVE_CHAT_FLOATING_EVENT = "houselink:live-chat-open-change";
const LIBRARY_BAG_FLOATING_EVENT = "houselink:library-bag-open-change";

export function setLiveChatFloatingOpen(open: boolean) {
  window.localStorage.setItem(LIVE_CHAT_OPEN_STORAGE_KEY, open ? "1" : "0");
  window.dispatchEvent(new CustomEvent(LIVE_CHAT_FLOATING_EVENT, { detail: { open } }));
}

export function isLiveChatFloatingOpen() {
  return typeof window !== "undefined" && window.localStorage.getItem(LIVE_CHAT_OPEN_STORAGE_KEY) === "1";
}

export function useLiveChatFloatingOpen() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(isLiveChatFloatingOpen());
    const onChange = (event: Event) => {
      setOpen(Boolean((event as CustomEvent<{ open?: boolean }>).detail?.open));
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === LIVE_CHAT_OPEN_STORAGE_KEY) setOpen(event.newValue === "1");
    };
    window.addEventListener(LIVE_CHAT_FLOATING_EVENT, onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(LIVE_CHAT_FLOATING_EVENT, onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return open;
}

export function setLibraryBagFloatingOpen(open: boolean) {
  window.dispatchEvent(new CustomEvent(LIBRARY_BAG_FLOATING_EVENT, { detail: { open } }));
}

export function useLibraryBagFloatingOpen() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onChange = (event: Event) => {
      setOpen(Boolean((event as CustomEvent<{ open?: boolean }>).detail?.open));
    };
    window.addEventListener(LIBRARY_BAG_FLOATING_EVENT, onChange);
    return () => window.removeEventListener(LIBRARY_BAG_FLOATING_EVENT, onChange);
  }, []);

  return open;
}
