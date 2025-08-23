#!/usr/bin/env python3
"""
Quick sanity test for OpenAI Responses API with a given model name.

Usage:
  - Ensure OPENAI_API_KEY is set (we load from .env by default)
  - Optionally set TEST_MODEL to override the model name (defaults to "gpt-5")
  - Run:  python scripts/test_gpt5.py

This prints the model attempted and the generated output text (or an error).
"""

import os
import sys
from dotenv import load_dotenv
from openai import OpenAI

def main():
  # Load .env so OPENAI_API_KEY is available for local runs
  load_dotenv()

  api_key = os.environ.get("OPENAI_API_KEY")
  if not api_key:
    print("ERROR: OPENAI_API_KEY is not set. Add it to .env or your shell env.")
    sys.exit(1)

  # Allow overriding the model via env var
  model = os.environ.get("TEST_MODEL", "gpt-5")

  client = OpenAI(api_key=api_key)

  prompt = "Write a short bedtime story about a unicorn."

  print(f"Attempting model: {model}")
  try:
    resp = client.responses.create(
      model=model,
      input=prompt
    )
    print("\n--- Output ---")
    # New SDK provides a convenience property:
    print(resp.output_text)
  except Exception as e:
    print("\n--- Error ---")
    print(str(e))
    # Non-zero exit so CI/scripts can detect failure if needed
    sys.exit(2)

if __name__ == "__main__":
  main()
