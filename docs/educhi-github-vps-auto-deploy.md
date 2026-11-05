# Educhi: install automatic GitHub → Bnix VPS deployment

This workflow deliberately does **nothing** until the repository variable
`EDUCHI_AUTO_DEPLOY` equals `true`. Only main can deploy, and only after the
workflow's build, TypeScript tests, unit tests and dependency audit pass.

### Initial VPS setup (once)

1. Connect to VPS with your existing administrator SSH account. `cd` into
   the currently running Educhi checkout (the directory containing
   `docker-compose.yml`). Check `pwd`, `git branch --show-current`,
   `docker compose ps`, and `git remote -v` first.
2. Update main one last time:

   ```bash
   git checkout main
   git pull --ff-only origin main
   sudo install -o root -g root -m 0750 scripts/vps-deploy-educhi.sh /usr/local/sbin/educhi-deploy
   printf 'EDUCHI_PROJECT_DIR=%q\n' "$PWD" | sudo tee /etc/educhi-deploy.conf
   sudo chown root:root /etc/educhi-deploy.conf
   sudo chmod 600 /etc/educhi-deploy.conf
   sudo adduser --disabled-password --gecos "" educhi-deploy
   sudo install -d -o educhi-deploy -g educhi-deploy -m 700 /home/educhi-deploy/.ssh
   printf '%s\n' 'educhi-deploy ALL=(root) NOPASSWD: /usr/local/sbin/educhi-deploy' | sudo tee /etc/sudoers.d/educhi-deploy
   sudo chmod 440 /etc/sudoers.d/educhi-deploy
   sudo visudo -cf /etc/sudoers.d/educhi-deploy
   ```

   If `educhi-deploy` already exists, skip the `sudo adduser` line.
   Never put this deployment account in `docker` or `sudo` groups.
   The sudoers entry allows **only** this fixed root-owned deployment script.

3. On **your own Windows PC**, open PowerShell and generate a dedicated SSH
   key. Press Enter twice when asked for the passphrase (the unattended action
   must read it without user input):

   ```powershell
   ssh-keygen -t ed25519 -a 64 -f "$env:USERPROFILE\.ssh\educhi_github_deploy" -C "educhi-github-actions"
   Get-Content "$env:USERPROFILE\.ssh\educhi_github_deploy.pub" | Set-Clipboard
   ```

4. On the **VPS**, run `sudo nano /home/educhi-deploy/.ssh/authorized_keys`
   and paste exactly **one line** containing:

   ```text
   restrict,command="sudo -n /usr/local/sbin/educhi-deploy" ssh-ed25519 AAAA... educhi-github-actions
   ```

   Replace `ssh-ed25519 AAAA... educhi-github-actions` with the COMPLETE
   public key copied from PowerShell, on the same line.
   Save in nano with Ctrl+O, Enter, Ctrl+X. Then:

   ```bash
   sudo chown educhi-deploy:educhi-deploy /home/educhi-deploy/.ssh/authorized_keys
   sudo chmod 600 /home/educhi-deploy/.ssh/authorized_keys
   sudo ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub
   sudo cat /etc/ssh/ssh_host_ed25519_key.pub
   ```

   The last command displays the VPS's **public host key**, not its private key.
   Use exactly this trusted key to pin the SSH connection, rather than trusting
   a fresh `ssh-keyscan` result without verification.

### GitHub settings (once)

Go to repository **Settings → Secrets and variables → Actions** and add three
**repository secrets**:

- `EDUCHI_VPS_HOST`: your VPS Bnix IP address only (no http/https).
- `EDUCHI_DEPLOY_PRIVATE_KEY`: complete private file
  `$env:USERPROFILE\.ssh\educhi_github_deploy`, including BEGIN/END lines.
  On your own Windows PC, copy it with
  `Get-Content "$env:USERPROFILE\.ssh\educhi_github_deploy" -Raw | Set-Clipboard`.
  **Never paste this key into a chat or a screenshot.**
- `EDUCHI_VPS_HOST_PUBLIC_KEY`: complete output of the VPS command
  `cat /etc/ssh/ssh_host_ed25519_key.pub`, starting with `ssh-ed25519`.

In the **Variables** tab, add:

- `EDUCHI_VPS_SSH_PORT`: the SSH port, normally `22`.
- `EDUCHI_AUTO_DEPLOY`: first set `false`. Set `true` only once
  ready to let GitHub update production on every main push.

Optionally create a GitHub environment called `production` with **deployment
branch restrictions** set to main. If you want hands-free operation, do not
add required reviewers; if you require an approval, a person must approve each
deployment.

### First deployment check

1. Check VPS has enough free disk space for temporary image builds and backups:
   `df -h`, `docker compose ps`, `docker compose exec -T web tar --version`.
2. Confirm the existing web/admin services are healthy and the database/volume
   contain the right production data. Verify a separate off-server backup.
3. Change `EDUCHI_AUTO_DEPLOY` to `true`.
4. On GitHub, open **Actions → Deploy Educhi VPS → Run workflow → main**.
   View logs under both `Validate release before deploy` and
   `Deploy validated commit to production VPS`.
5. Check the real HTTPS website, mobile home, student login, admin login and
   payment status. The workflow does NOT run real Google or bank integration.
6. After that, every successful push to main initiates the same verification
   and deployment. Failed tests do **not** connect to the VPS.

### Safety and limitations

- SSH account is restricted to one root-owned command. The key must never
  be committed to Git or sent in chat.
- No database reset, `docker compose down -v`, or automatic payment changes.
- The script takes database and upload backups in `/var/backups/educhi`
  (14-day local retention), but you also need **off-VPS backups**.
- Application preflight checks security configuration, PostgreSQL, ClamAV,
  private storage; local HTTP probes check ports 3000 and 4000.
- If a release fails **after** migration, the script stops and reports failure.
  It does not automatically reverse a database migration or guarantee rollback.
- Do not set `EDUCHI_AUTO_DEPLOY=true` until the initial manual setup is
  complete, and keep `main` protected by PR review + required status checks.
