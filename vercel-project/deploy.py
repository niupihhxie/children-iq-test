import os
import sys
import json
import hashlib
import time
import requests

TOKEN = os.environ.get("VERCEL_TOKEN", "")
PROJECT_ID = "prj_9W65QugfcPTng5SzAvkwQIYgcg7B"
ROOT = os.path.dirname(os.path.abspath(__file__))

def sha1_file(path):
    h = hashlib.sha1()
    with open(path, 'rb') as f:
        while True:
            chunk = f.read(8192)
            if not chunk:
                break
            h.update(chunk)
    return h.hexdigest()

def collect_files():
    files = []
    for dirpath, dirnames, filenames in os.walk(ROOT):
        # skip node_modules and .vercel
        dirnames[:] = [d for d in dirnames if d not in ('node_modules', '.vercel', '.git')]
        for name in filenames:
            full = os.path.join(dirpath, name)
            rel = os.path.relpath(full, ROOT).replace('\\', '/')
            files.append({
                'file': rel,
                'sha': sha1_file(full),
                'size': os.path.getsize(full)
            })
    return files

def main():
    files = collect_files()
    print(f"Collected {len(files)} files")

    headers = {
        "Authorization": f"Bearer {TOKEN}",
        "Content-Type": "application/json"
    }

    # Create deployment
    payload = {
        "name": "vercel-project",
        "project": PROJECT_ID,
        "target": "production",
        "files": files
    }

    print("Creating deployment...")
    r = requests.post("https://api.vercel.com/v13/deployments", headers=headers, json=payload)
    if r.status_code == 400:
        err = r.json().get('error', {})
        if err.get('code') == 'missing_files':
            missing = err.get('missing', [])
            print(f"Missing files: {len(missing)}, uploading...")
            for sha in missing:
                fobj = next((f for f in files if f['sha'] == sha), None)
                if not fobj:
                    print(f"Warning: cannot find file for sha {sha}")
                    continue
                full = os.path.join(ROOT, fobj['file'])
                print(f"Uploading {fobj['file']}...")
                with open(full, 'rb') as f:
                    upload_headers = {
                        "Authorization": f"Bearer {TOKEN}",
                        "x-vercel-digest": sha,
                        "Content-Type": "application/octet-stream"
                    }
                    ur = requests.post("https://api.vercel.com/v2/files", headers=upload_headers, data=f)
                    if ur.status_code not in (200, 201, 204):
                        print(f"Failed to upload {fobj['file']}: {ur.status_code} {ur.text}")
                        sys.exit(1)
            print("Retrying deployment creation...")
            r = requests.post("https://api.vercel.com/v13/deployments", headers=headers, json=payload)

    if r.status_code != 200:
        print(f"Failed to create deployment: {r.status_code}")
        print(r.text)
        sys.exit(1)

    data = r.json()
    dep_id = data['id']
    url = data['url']
    print(f"Deployment {dep_id} created: https://{url}")

    print("Polling for READY...")
    for i in range(60):
        dr = requests.get(f"https://api.vercel.com/v13/deployments/{dep_id}", headers={"Authorization": f"Bearer {TOKEN}"})
        d = dr.json()
        state = d.get('readyState') or d.get('state')
        print(f"  [{i+1}] state={state}")
        if state == 'READY':
            print(f"Deployment ready: https://{url}")
            print(f"Production alias: https://vercel-project-pi-seven.vercel.app")
            break
        if state in ('ERROR', 'CANCELED'):
            print(f"Deployment failed: {state}")
            print(json.dumps(d, indent=2))
            sys.exit(1)
        time.sleep(2)
    else:
        print("Timeout waiting for deployment")
        sys.exit(1)

if __name__ == '__main__':
    main()
