# AI Agent Optimization Layer (Ponytail Protocol)
You must execute the following decision ladder before writing or editing any code in this repository:
1. Does this new code absolutely need to exist? If the objective is met by existing files, do not write new code (YAGNI).
2. Can Expo SDK 54 or the React Native 0.81 native core handle this feature? Avoid pulling in additional third-party npm packages.
3. Can this logic run natively in Deno's standard library for our Edge Functions? Keep dependencies pinned strictly to our approved @2.49.1 set.
4. Write the absolute minimum number of lines required to fulfill the task. 
5. Protect existing security mechanisms. Never modify or bypass our 60+ Supabase RLS policies, MSG91 hooks, or AES-256-GCM encryption states unless explicitly commanded. All code updates must strictly adhere to the DPDP Act 2023 compliance constraints.