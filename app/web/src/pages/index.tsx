import useSWR from "swr";
import Link from "next/link";
import { useState, useEffect } from "react";
import {
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
  differenceInSeconds,
  format,
} from "date-fns";
import classnames from "classnames";

import { getURL } from "utils";
import { PostDialog } from "components";

const fetcher = <T,>(path: string): Promise<T> => {
  return fetch(getURL(path), {
    headers: {
      Authorization: `Bearer ${window.localStorage.getItem("token")}`,
    },
  }).then((res) => {
    if (!res.ok) {
      throw new Error(res.statusText);
    }
    return res.json();
  });
};

export default function IndexPage() {
  useEffect(() => {
    fetch(getURL("/tokens"), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${window.localStorage.getItem("token")}`,
      },
    }).then((res) => {
      res.json().then((d) => {
        window.localStorage.setItem("token", d.token);
        setIsInitialized(true);
      });
    });
  }, []);

  const { data, mutate } = useSWR<Post[]>("/posts", fetcher);
  const posts = data || [];

  const [isInitialized, setIsInitialized] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  return !isInitialized ? null : (
    <>
      <div className="flex justify-center">
        <div className="relative w-full max-w-screen-sm">
          <h2
            className="sticky top-0 border-b bg-white px-2 py-4 sm:px-0"
            onClick={() => {
              mutate();
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            Home
          </h2>
          <ul>
            {posts.map((post) => {
              const dSecs = differenceInSeconds(Date.now(), post.created);
              const dMins = differenceInMinutes(Date.now(), post.created);
              const dHours = differenceInHours(Date.now(), post.created);
              const dDays = differenceInDays(Date.now(), post.created);
              const plural = (num: number, unit: string) => {
                return num === 1 ? unit : unit + "s";
              };

              return (
                <li key={post.id} className="border-b">
                  <Link href={`/posts/${post.id}`}>
                    {post.imagePath ? (
                      <img src={getURL(post.imagePath)} />
                    ) : null}
                    <div
                      className={classnames("px-2 pb-2 pt-2 sm:px-0", {
                        "pt-4": !post.imagePath,
                      })}
                    >
                      {post.content}
                    </div>
                    <div className="px-2 pb-4 text-sm text-slate-500 sm:px-0">
                      <span className="pr-2">
                        {dSecs < 60
                          ? `${dSecs}${plural(dSecs, "sec")}`
                          : dMins < 60
                            ? `${dMins}${plural(dMins, "min")}`
                            : dHours < 13
                              ? `${dHours}${plural(dHours, "hour")}`
                              : `${dDays}${plural(dDays, "day")}`}
                      </span>
                      <span>{format(post.created, "MM/dd HH:mm")} </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className="fixed bottom-8 right-4 sm:bottom-12 sm:right-12">
        <button
          onClick={() => setIsOpen(true)}
          className="h-16 w-16 rounded-full bg-blue-400 text-white"
        >
          <span className="material-icons text-4xl">post_add</span>
        </button>
      </div>

      <PostDialog
        open={isOpen}
        onClose={() => {
          mutate();
          setIsOpen(false);
        }}
      />
    </>
  );
}
