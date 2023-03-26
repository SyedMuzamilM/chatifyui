import { Message } from '@/types/chat';
import { OpenAIModel, OpenAIModelID } from '@/types/openai';
import { Prompt } from '@/types/prompt';
import { IconPlayerStop, IconRepeat, IconSend } from '@tabler/icons-react';
import { useTranslation } from 'next-i18next';
import {
  FC,
  KeyboardEvent,
  MutableRefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

interface Props {
  messageIsStreaming: boolean;
  model: OpenAIModel;
  messages: Message[];
  prompts: Prompt[];
  onSend: (message: Message) => void;
  onRegenerate: () => void;
  stopConversationRef: MutableRefObject<boolean>;
  textareaRef: MutableRefObject<HTMLTextAreaElement | null>;
}

export const ChatInput: FC<Props> = ({
  messageIsStreaming,
  model,
  messages,
  prompts,
  onSend,
  onRegenerate,
  stopConversationRef,
  textareaRef,
}) => {
  const { t } = useTranslation('chat');
  const [content, setContent] = useState<string>();
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [showPromptList, setShowPromptList] = useState(false);
  const [activePromptIndex, setActivePromptIndex] = useState(0);
  const [promptInputValue, setPromptInputValue] = useState('');

  const promptListRef = useRef<HTMLUListElement | null>(null);

  const filteredPrompts = prompts.filter((prompt) =>
    prompt.name.toLowerCase().includes(promptInputValue.toLowerCase()),
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const maxLength = model.id === OpenAIModelID.GPT_3_5 ? 12000 : 24000;

    if (value.length > maxLength) {
      alert(
        t(
          `Message limit is {{maxLength}} characters. You have entered {{valueLength}} characters.`,
          { maxLength, valueLength: value.length },
        ),
      );
      return;
    }

    setContent(value);

    if (value) {
      setIsTyping(true);
    }

    updatePromptListVisibility(value);
  };

  const handleSend = () => {
    if (messageIsStreaming) {
      return;
    }

    if (!content) {
      alert(t('Please enter a message'));
      return;
    }

    onSend({ role: 'user', content });
    setContent('');

    if (window.innerWidth < 640 && textareaRef && textareaRef.current) {
      textareaRef.current.blur();
    }
  };

  const handleStopConversation = () => {
    stopConversationRef.current = true;
    setTimeout(() => {
      stopConversationRef.current = false;
    }, 1000);
  };

  const isMobile = () => {
    const userAgent =
      typeof window.navigator === 'undefined' ? '' : navigator.userAgent;
    const mobileRegex =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i;
    return mobileRegex.test(userAgent);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (showPromptList) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActivePromptIndex((prevIndex) =>
          prevIndex < prompts.length - 1 ? prevIndex + 1 : prevIndex,
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActivePromptIndex((prevIndex) =>
          prevIndex > 0 ? prevIndex - 1 : prevIndex,
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selectedPrompt = filteredPrompts[activePromptIndex];
        setContent((prevContent) => {
          const newContent = prevContent?.replace(
            /\/\w*$/,
            selectedPrompt.content,
          );
          updatePromptListVisibility(newContent || '');
          return newContent;
        });
      } else {
        setActivePromptIndex(0);
      }
    }

    if (!isTyping) {
      if (e.key === 'Enter' && !e.shiftKey && !isMobile()) {
        e.preventDefault();
        handleSend();
      }
    }
  };

  const updatePromptListVisibility = useCallback((text: string) => {
    const match = text.match(/\/\w*$/);
    if (match) {
      setShowPromptList(true);
      setPromptInputValue(match[0].slice(1));
    } else {
      setShowPromptList(false);
      setPromptInputValue('');
    }
  }, []);

  useEffect(() => {
    if (promptListRef.current) {
      promptListRef.current.scrollTop = activePromptIndex * 30;
    }
  }, [activePromptIndex]);

  useEffect(() => {
    if (textareaRef && textareaRef.current) {
      textareaRef.current.style.height = 'inherit';
      textareaRef.current.style.height = `${textareaRef.current?.scrollHeight}px`;
      textareaRef.current.style.overflow = `${
        textareaRef?.current?.scrollHeight > 400 ? 'auto' : 'hidden'
      }`;
    }
  }, [content]);

  return (
    <div className="dark:bg-vert-dark-gradient absolute bottom-0 left-0 w-full border-transparent bg-white from-[#343541] via-[#343541] to-[#343541]/0 pt-6 dark:border-white/20 dark:bg-[#444654] dark:!bg-transparent dark:bg-gradient-to-t md:pt-2">
      <div className="stretch mx-2 mt-4 flex flex-row gap-3 last:mb-2 md:mx-4 md:mt-[52px] md:last:mb-6 lg:mx-auto lg:max-w-3xl">
        {messageIsStreaming && (
          <button
            className="absolute top-2 left-0 right-0 mx-auto w-fit rounded border border-gray-500 py-2 px-4 text-black hover:opacity-50 dark:bg-[#343541] dark:text-white md:top-1"
            onClick={handleStopConversation}
          >
            <IconPlayerStop size={16} className="mb-[2px] inline-block" />{' '}
            {t('Stop Generating')}
          </button>
        )}

        {!messageIsStreaming && messages.length > 0 && (
          <button
            className="absolute top-2 left-0 right-0 mx-auto w-fit rounded border border-gray-500 py-2 px-4 text-black hover:opacity-50 dark:bg-[#343541] dark:text-white md:top-1"
            onClick={onRegenerate}
          >
            <IconRepeat size={16} className="mb-[2px] inline-block" />{' '}
            {t('Regenerate response')}
          </button>
        )}

        <div className="relative mx-2 flex w-full flex-grow flex-col rounded-md border border-black/10 bg-white py-2 shadow-[0_0_10px_rgba(0,0,0,0.10)] dark:border-gray-900/50 dark:bg-[#40414F] dark:text-white dark:shadow-[0_0_15px_rgba(0,0,0,0.10)] sm:mx-4 md:py-3 md:pl-4">
          <textarea
            ref={textareaRef}
            className="m-0 w-full resize-none border-0 bg-transparent p-0 pr-7 pl-2 text-black outline-none focus:ring-0 focus-visible:ring-0 dark:bg-transparent dark:text-white md:pl-0"
            style={{
              resize: 'none',
              bottom: `${textareaRef?.current?.scrollHeight}px`,
              maxHeight: '400px',
              overflow: `${
                textareaRef.current && textareaRef.current.scrollHeight > 400
                  ? 'auto'
                  : 'hidden'
              }`,
            }}
            placeholder={
              t('Type a message or type "/" to select a prompt...') || ''
            }
            value={content}
            rows={1}
            onCompositionStart={() => setIsTyping(true)}
            onCompositionEnd={() => setIsTyping(false)}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
          />

          <button
            className="absolute right-5 rounded-sm p-1 text-neutral-800 hover:bg-neutral-200 hover:text-neutral-900 focus:outline-none dark:bg-opacity-50 dark:text-neutral-100 dark:hover:text-neutral-200"
            onClick={handleSend}
          >
            <IconSend size={16} className="opacity-60" />
          </button>

          {showPromptList && (
            <ul
              ref={promptListRef}
              className="absolute origin-bottom overflow-auto rounded border border-gray-300 bg-white shadow-md dark:border-gray-900/50 dark:bg-[#343541]"
              style={{
                width: 'calc(100% - 48px)',
                bottom: '100%',
                marginBottom: '4px',
                maxHeight: '150px', // Adjust this value as needed
              }}
            >
              {filteredPrompts.map((prompt, index) => (
                <li
                  key={prompt.id}
                  className={`${
                    index === activePromptIndex
                      ? 'bg-gray-200 dark:bg-gray-900'
                      : ''
                  } cursor-pointer px-3 py-2 text-sm text-black hover:bg-gray-200 dark:hover:bg-gray-900`}
                  onClick={() => {
                    setContent((prevContent) => {
                      const newContent = prevContent?.replace(
                        /\/\w*$/,
                        prompt.content,
                      );
                      updatePromptListVisibility(newContent || '');
                      return newContent;
                    });
                  }}
                >
                  {prompt.name}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="px-3 pt-2 pb-3 text-center text-[12px] text-black/50 dark:text-white/50 md:px-4 md:pt-3 md:pb-6">
        <a
          href="https://github.com/mckaywrigley/chatbot-ui"
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          ChatBot UI
        </a>
        .{' '}
        {t(
          "Chatbot UI is an advanced chatbot kit for OpenAI's chat models aiming to mimic ChatGPT's interface and functionality.",
        )}
      </div>
    </div>
  );
};
