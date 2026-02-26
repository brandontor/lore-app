'use client';

import { useState } from 'react';
import { MessageSquare, Copy, Check, ExternalLink, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';

// The bot's Discord application ID — public, not a secret
const DISCORD_CLIENT_ID = '1428181238471987302';
const INVITE_URL = `https://discord.com/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&permissions=3214336&scope=bot%20applications.commands`;

interface Props {
  campaignId: string;
  hasChannels: boolean;
}

export function DiscordConnectButton({ campaignId, hasChannels }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const command = `/link campaign_id:${campaignId}`;

  function copyCommand() {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <MessageSquare className="h-4 w-4" />
        {hasChannels ? 'Connect Another Channel' : 'Connect Bot'}
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl dark:bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-1 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-violet-500" />
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Connect Discord Bot
              </h2>
            </div>
            <p className="mb-6 text-sm text-zinc-500">
              Follow these steps to record voice sessions directly from your Discord server.
            </p>

            <ol className="space-y-6">
              <li className="flex gap-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-semibold text-violet-700 dark:bg-violet-900/40 dark:text-violet-400">
                  1
                </span>
                <div>
                  <p className="mb-2 font-medium text-zinc-900 dark:text-zinc-100">
                    Add the bot to your server
                  </p>
                  <a href={INVITE_URL} target="_blank" rel="noopener noreferrer">
                    <Button variant="secondary">
                      <ExternalLink className="h-4 w-4" />
                      Invite Lore-Forge Bot
                    </Button>
                  </a>
                </div>
              </li>

              <li className="flex gap-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-semibold text-violet-700 dark:bg-violet-900/40 dark:text-violet-400">
                  2
                </span>
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">
                    Join a voice channel in Discord
                  </p>
                  <p className="mt-1 text-sm text-zinc-500">
                    The bot will join whichever voice channel you&apos;re in when you run the next command.
                  </p>
                </div>
              </li>

              <li className="flex gap-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-semibold text-violet-700 dark:bg-violet-900/40 dark:text-violet-400">
                  3
                </span>
                <div className="flex-1 min-w-0">
                  <p className="mb-2 font-medium text-zinc-900 dark:text-zinc-100">
                    Link the channel to this campaign
                  </p>
                  <p className="mb-2 text-sm text-zinc-500">
                    Run this slash command in your Discord server:
                  </p>
                  <div className="flex items-center gap-2 rounded-lg bg-zinc-100 px-3 py-2.5 dark:bg-zinc-800">
                    <code className="flex-1 min-w-0 truncate text-sm text-zinc-800 dark:text-zinc-200">
                      {command}
                    </code>
                    <button
                      onClick={copyCommand}
                      className="shrink-0 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                      title="Copy command"
                    >
                      {copied
                        ? <Check className="h-4 w-4 text-emerald-500" />
                        : <Copy className="h-4 w-4" />
                      }
                    </button>
                  </div>
                </div>
              </li>
            </ol>

            <div className="mt-6 rounded-lg bg-zinc-50 px-4 py-3 dark:bg-zinc-800/50">
              <p className="text-xs text-zinc-500">
                Once linked, use{' '}
                <code className="font-mono text-zinc-700 dark:text-zinc-300">/record</code> to start a session
                and{' '}
                <code className="font-mono text-zinc-700 dark:text-zinc-300">/stop</code> to end it.
                Transcripts will appear in this campaign automatically.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
