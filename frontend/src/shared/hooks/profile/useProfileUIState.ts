import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function useProfileUIState() {
    const location = useLocation();
    const [mainViewTab, setMainViewTab] = useState<'statistics' | 'dashboard'>(
        'statistics'
    );
    const [activeTab, setActiveTab] = useState<'created' | 'paid'>('created');
    
    const [invoiceSearch, setInvoiceSearch] = useState('');
    
    const [valueFilterType, setValueFilterType] = useState<'none' | 'amount' | 'earnings'>('none');
    const [valueFilterInput, setValueFilterInput] = useState('');
    const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
    const filterDropdownRef = useRef<HTMLDivElement>(null);
    
    const [dateFilterMode, setDateFilterMode] = useState<'all' | 'single' | 'range'>('all');
    const [singleDateFilter, setSingleDateFilter] = useState('');
    const [rangeStartDateFilter, setRangeStartDateFilter] = useState('');
    const [rangeEndDateFilter, setRangeEndDateFilter] = useState('');

    const [selectedPaymentIds, setSelectedPaymentIds] = useState<string[] | null>(null);
    const [selectedReceipts, setSelectedReceipts] = useState<any[] | null>(null);
    const [selectedNotes, setSelectedNotes] = useState<string[] | null>(null);

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
                setIsFilterDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab, invoiceSearch, valueFilterType, valueFilterInput, dateFilterMode, singleDateFilter, rangeStartDateFilter, rangeEndDateFilter]);

    useEffect(() => {
        if (activeTab === 'paid' && valueFilterType === 'earnings') {
            setValueFilterType('amount');
        }
    }, [activeTab, valueFilterType]);

    useEffect(() => {
        if (location.pathname === '/dashboard/dashboard' || location.pathname === '/dashboard') {
            setMainViewTab('dashboard');
        } else if (
            location.pathname === '/dashboard/statistics' ||
            location.pathname === '/dashboard/stats' ||
            location.pathname === '/profile/statistics' ||
            location.pathname === '/profile/stats' ||
            location.pathname === '/profile'
        ) {
            setMainViewTab('statistics');
        }
    }, [location.pathname]);

    const hasInvalidValueFilter = valueFilterType !== 'none' && (valueFilterInput.trim() !== '' && (isNaN(Number(valueFilterInput)) || Number(valueFilterInput) < 0));
    const appliedValueFilterAmount = valueFilterType !== 'none' && !hasInvalidValueFilter && valueFilterInput.trim() !== '' ? Number(valueFilterInput) : null;
    const searchPlaceholder = activeTab === 'created'
        ? 'Search by invoice hash, salt, title, memo, or merchant note...'
        : 'Search by invoice hash or payer note...';

    return {
        mainViewTab,
        setMainViewTab,
        activeTab,
        setActiveTab,
        invoiceSearch,
        setInvoiceSearch,
        valueFilterType,
        setValueFilterType,
        valueFilterInput,
        setValueFilterInput,
        isFilterDropdownOpen,
        setIsFilterDropdownOpen,
        filterDropdownRef,
        dateFilterMode,
        setDateFilterMode,
        singleDateFilter,
        setSingleDateFilter,
        rangeStartDateFilter,
        setRangeStartDateFilter,
        rangeEndDateFilter,
        setRangeEndDateFilter,
        selectedPaymentIds,
        setSelectedPaymentIds,
        selectedReceipts,
        setSelectedReceipts,
        selectedNotes,
        setSelectedNotes,
        currentPage,
        setCurrentPage,
        itemsPerPage,
        hasInvalidValueFilter,
        appliedValueFilterAmount,
        searchPlaceholder
    };
}
