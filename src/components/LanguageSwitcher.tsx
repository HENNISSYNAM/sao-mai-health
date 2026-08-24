import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { supportedLanguages, setLanguage } from '@/i18n';

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  // Normalise resolved language — any zh variant → zh-HK
  const resolved = i18n.language?.startsWith('zh') ? 'zh-HK' : (i18n.language ?? 'en');
  const currentLang =
    supportedLanguages.find(l => l.code === resolved) ?? supportedLanguages[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 px-2">
          <Globe className="h-3.5 w-3.5" />
          <span className="hidden sm:inline text-sm">{currentLang.flag} {currentLang.name}</span>
          <span className="sm:hidden">{currentLang.flag}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[160px]">
        <DropdownMenuLabel className="text-[10px] font-normal text-muted-foreground tracking-wider uppercase">
          Language / 語言 / Ngôn ngữ
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {supportedLanguages.map((lang) => {
          const isActive = resolved === lang.code;
          return (
            <DropdownMenuItem
              key={lang.code}
              onClick={() => setLanguage(lang.code)}
              className={`gap-2 cursor-pointer ${isActive ? 'bg-accent font-semibold' : ''}`}
            >
              <span className="text-base">{lang.flag}</span>
              <div className="flex flex-col leading-tight">
                <span className="text-sm">{lang.name}</span>
                {'nativeName' in lang && (
                  <span className="text-[10px] text-muted-foreground">{(lang as any).nativeName}</span>
                )}
              </div>
              {isActive && <span className="ml-auto text-[10px] text-primary">✓</span>}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
