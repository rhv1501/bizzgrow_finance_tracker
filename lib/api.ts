import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function parseZodError(error: unknown): string {
  if (error instanceof ZodError) {
    const issue = error.issues[0];
    if (!issue) {
      return "Invalid input";
    }

    return `${issue.path.join(".") || "field"}: ${issue.message}`;
  }

  return "Something went wrong";
}
