<?php

namespace JrAccessibility\Core;

if (!function_exists('JrAccessibility\\Core\\sstc_social_brand')) {
    function sstc_social_brand(?string $name): string
    {
        $value = strtolower(trim((string) $name));
        if ($value === '') {
            return '';
        }

        $map = [
            'facebook' => 'facebook',
            'instagram' => 'instagram',
            'ig' => 'instagram',
            'twitter' => 'twitter',
            'x' => 'twitter',
            'linkedin' => 'linkedin',
            'youtube' => 'youtube',
            'tiktok' => 'tiktok',
            'whatsapp' => 'whatsapp',
            'telegram' => 'telegram',
            'line' => 'line',
            'discord' => 'discord',
        ];

        foreach ($map as $needle => $brand) {
            if (strpos($value, $needle) !== false) {
                return $brand;
            }
        }

        return '';
    }
}

if (!function_exists('JrAccessibility\\Core\\sstc_social_icon_class')) {
    function sstc_social_icon_class(?string $name, string $set = 'fa'): string
    {
        $brand = sstc_social_brand($name);

        $faMap = [
            'facebook' => 'fab fa-facebook-f',
            'instagram' => 'fab fa-instagram',
            'twitter' => 'fab fa-twitter',
            'linkedin' => 'fab fa-linkedin-in',
            'youtube' => 'fab fa-youtube',
            'tiktok' => 'fab fa-tiktok',
            'whatsapp' => 'fab fa-whatsapp',
            'telegram' => 'fab fa-telegram-plane',
            'line' => 'fab fa-line',
            'discord' => 'fab fa-discord',
        ];

        $biMap = [
            'facebook' => 'bi bi-facebook',
            'instagram' => 'bi bi-instagram',
            'twitter' => 'bi bi-twitter',
            'linkedin' => 'bi bi-linkedin',
            'youtube' => 'bi bi-youtube',
            'tiktok' => 'bi bi-tiktok',
            'whatsapp' => 'bi bi-whatsapp',
            'telegram' => 'bi bi-telegram',
            'line' => 'bi bi-line',
            'discord' => 'bi bi-discord',
        ];

        if ($set === 'bi') {
            return $biMap[$brand] ?? 'bi bi-share-fill';
        }

        return $faMap[$brand] ?? 'fas fa-share-alt';
    }
}

if (!function_exists('JrAccessibility\\Core\\sstc_quick_link_icon_class')) {
    function sstc_quick_link_icon_class(string $icon): string
    {
        $clean = trim($icon);
        if ($clean === '') {
            return '';
        }
        if (str_starts_with($clean, 'bi ')) {
            return $clean;
        }
        if (str_starts_with($clean, 'bi-')) {
            return 'bi ' . $clean;
        }
        return $clean;
    }
}