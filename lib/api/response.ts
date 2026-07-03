import { NextResponse } from "next/server";

type Meta = Record<string, string | number | boolean | null | undefined>;

export function ok<T>(data: T, meta: Meta = {}) {
  return NextResponse.json({
    data,
    meta: {
      requestId: crypto.randomUUID(),
      ...meta,
    },
  });
}

export function created<T>(data: T, meta: Meta = {}) {
  return NextResponse.json(
    {
      data,
      meta: {
        requestId: crypto.randomUUID(),
        ...meta,
      },
    },
    { status: 201 },
  );
}

export function problem(status: number, code: string, message: string) {
  return NextResponse.json(
    {
      error: {
        code,
        message,
      },
      meta: {
        requestId: crypto.randomUUID(),
      },
    },
    { status },
  );
}
