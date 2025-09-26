'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, MapPin, Camera, AlertTriangle, CheckCircle, Wifi, WifiOff } from 'lucide-react';
import { reportsApi, categoriesApi, locationApi } from '@/services/api';
import { Category, ReportCategory, Location, ReportFormData, Report } from '@/types';
import Image from 'next/image';
import { compressImage, uploadCompressedImage, formatBytes } from '@/lib/imageUtils';
import offlineQueue, { queueUtils } from '@/lib/offlineQueue';
import syncManager from '@/lib/syncManager';

interface ReportFormProps {
  onSubmitSuccess?: (reportId: string) => void;
  onSubmitError?: (error: string) => void;
}

export default function ReportForm({ onSubmitSuccess, onSubmitError }: ReportFormProps) {
  // State management
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState<ReportFormData>({
    category: 'Infrastructure',
    description: '',
    location: undefined,
    address: '',
    photo: undefined
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [locationStatus, setLocationStatus] = useState<'none' | 'getting' | 'success' | 'error'>('none');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isOnline, setIsOnline] = useState(true);

  // Load categories and setup network monitoring on mount
  useEffect(() => {
    loadCategories();
    
    // Monitor network status
    const updateNetworkStatus = () => {
      const online = navigator.onLine;
      setIsOnline(online);
    };

    // Set initial status
    updateNetworkStatus();

    // Listen for network changes
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);

    // Monitor sync manager network status
    // The syncManager emits a union payload; make the param optional + defensive
    const handleNetworkChange = (data?: { status?: string } | unknown) => {
      // Accept objects that may have a status field; default to current navigator state if missing
      const status = (data as { status?: string } | undefined)?.status;
      const online = status ? status === 'online' : navigator.onLine;
      setIsOnline(online);
    };

    syncManager.on('network-changed', handleNetworkChange);

    return () => {
      window.removeEventListener('online', updateNetworkStatus);
      window.removeEventListener('offline', updateNetworkStatus);
      syncManager.off('network-changed', handleNetworkChange);
    };
  }, []);

  const loadCategories = async () => {
    try {
      const response = await categoriesApi.getCategories();
      setCategories(response.categories);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      return;
    }

    setIsGettingLocation(true);
    setLocationStatus('getting');
    setError('');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const location: Location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };

        try {
          // Validate location with backend
          const validation = await locationApi.validateLocation(location);
          
          setFormData(prev => ({ ...prev, location }));
          setLocationStatus('success');
          
          if (validation.suggestedAddress) {
            setFormData(prev => ({ ...prev, address: validation.suggestedAddress || '' }));
          }

          if (validation.warnings && validation.warnings.length > 0) {
            setError(validation.warnings.join('. '));
          }
        } catch (err) {
          console.error('Location validation failed:', err);
          // Still set location even if validation fails
          setFormData(prev => ({ ...prev, location }));
          setLocationStatus('success');
        }
        
        setIsGettingLocation(false);
      },
      (err) => {
        console.error('Geolocation error:', err);
        setError(`Location access failed: ${err.message}`);
        setLocationStatus('error');
        setIsGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Photo must be smaller than 10MB');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return;
    }

    setFormData(prev => ({ ...prev, photo: file }));
    
    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    // Clear any previous errors
    setError('');
  };

  const resetForm = () => {
    setFormData({
      category: 'Infrastructure',
      description: '',
      location: undefined,
      address: '',
      photo: undefined
    });
    setLocationStatus('none');
    setPreviewUrl('');
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      // Validation
      if (!formData.category) {
        throw new Error('Please select a category');
      }
      if (!formData.description.trim()) throw new Error('Please provide a description');
      if (formData.description.length > 500) throw new Error('Description must be 500 characters or less');
      if (!formData.location) throw new Error('Please enable location access or set your location manually');
  if (!formData.address?.trim()) throw new Error('Please provide an address or landmark');
      if (!formData.photo) throw new Error('Please attach a photo');

      // Handle optional photo: compress + upload (if online)
      let photoMeta: { photo_url?: string; photo_public_id?: string } = {};

      if (formData.photo) {
        try {
          // Compress locally first
            const compressed = await compressImage(formData.photo);
            console.log(`📷 Image compressed: ${formatBytes(compressed.originalSize)} → ${formatBytes(compressed.compressedSize)} (${(compressed.ratio*100).toFixed(1)}%)`);

          if (isOnline && !queueUtils.shouldQueue()) {
            // Upload to backend which streams to Cloudinary
            const uploaded = await uploadCompressedImage(compressed.file);
            photoMeta = { photo_url: uploaded.url, photo_public_id: uploaded.public_id };
          } else {
            console.log('📱 Offline - deferring photo upload (photo will not be included in queued report)');
          }
        } catch (err) {
          console.warn('Image processing/upload failed, proceeding without photo:', err);
        }
      }

      // Prepare submission data (include photo if available now)
      const submissionData = {
        category: formData.category,
        description: formData.description.trim(),
        location: formData.location,
        address: formData.address?.trim() || undefined,
        ...photoMeta,
      };

      // Check if we should use offline queue
      if (!isOnline || queueUtils.shouldQueue()) {
        console.log('📱 Submitting report to offline queue...');
        
        // Add to offline queue
        const queueId = await offlineQueue.addToQueue(submissionData);
        
        setSuccess('Report queued for submission when online!');
        
        // Reset form
        resetForm();
        
        // Call success callback with queue ID
        onSubmitSuccess?.(queueId);
        
        return;
      }

  // Submit report online
  console.log('🌐 Submitting report online...');
  // Construct a ReportSubmission (location guaranteed by earlier validation)
  const submission: {
    category: ReportCategory;
    description: string;
    location: Location;
    address?: string;
    photo?: File | string;
    photo_url?: string;
    photo_public_id?: string;
  } = {
    category: submissionData.category as ReportCategory,
    description: submissionData.description,
    location: submissionData.location as Location,
    address: submissionData.address,
  };

  // Merge photo metadata if available
  if (photoMeta.photo_url) submission.photo_url = photoMeta.photo_url;
  if (photoMeta.photo_public_id) submission.photo_public_id = photoMeta.photo_public_id;

  const report = (await reportsApi.submitReport(submission)) as Report;
      
      setSuccess('Report submitted successfully!');
      
      // Reset form
      resetForm();

      // Call success callback
      onSubmitSuccess?.(report.id);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit report. Please try again.';
      setError(errorMessage);
      onSubmitError?.(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCategory = categories.find(cat => cat.id === formData.category);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            <CardTitle>Report an Issue</CardTitle>
          </div>
          <div className="flex items-center gap-2 text-sm">
            {isOnline ? (
              <div className="flex items-center gap-1 text-green-600">
                <Wifi className="h-4 w-4" />
                <span>Online</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-orange-600">
                <WifiOff className="h-4 w-4" />
                <span>Offline</span>
              </div>
            )}
          </div>
        </div>
        <CardDescription>
          Help improve your barangay by reporting local issues
          {!isOnline && " • Reports will be submitted when you&apos;re back online"}
        </CardDescription>
      </CardHeader>
      <CardContent>
  <form onSubmit={handleSubmit} className="space-y-6" role="form" aria-describedby="report-form-help">
          {/* Category Selection */}
          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select 
              value={formData.category} 
              onValueChange={(value: ReportCategory) => setFormData(prev => ({ ...prev, category: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select issue category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(category => (
                  <SelectItem key={category.id} value={category.id}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: category.color }}
                      />
                      <span>{category.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedCategory && (
              <p className="text-sm text-muted-foreground">
                {selectedCategory.description}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description * <span className="sr-only">required</span></Label>
            <Textarea
              id="description"
              placeholder="Describe the issue in detail..."
              value={formData.description}
              aria-required="true"
              aria-describedby="description-help"
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              maxLength={500}
              rows={4}
              className="resize-none"
            />
            <div className="flex justify-between text-sm text-muted-foreground" id="description-help">
              <span>Be specific about the location and issue</span>
              <span>{formData.description.length}/500</span>
            </div>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label>Location *</Label>
            <div className="space-y-3">
              <Button
                type="button"
                variant="outline"
                onClick={getCurrentLocation}
                disabled={isGettingLocation}
                className="w-full"
                aria-live="polite"
              >
                {isGettingLocation ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : locationStatus === 'success' ? (
                  <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                ) : (
                  <MapPin className="mr-2 h-4 w-4" />
                )}
                {isGettingLocation ? 'Getting Location...' : 
                 locationStatus === 'success' ? 'Location Set' : 'Get Current Location'}
              </Button>
              
              {formData.location && (
                <div className="text-sm text-muted-foreground">
                  Coordinates: {formData.location.latitude.toFixed(6)}, {formData.location.longitude.toFixed(6)}
                </div>
              )}
            </div>
          </div>

          {/* Address  */}
          <div className="space-y-2">
            <Label htmlFor="address">Address *</Label>
            <Input
              id="address"
              placeholder="Street address or landmark"
              value={formData.address}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, address: e.target.value }))}
            />
          </div>

          {/* Photo Upload */}
          <div className="space-y-2">
            <Label htmlFor="photo">Photo *</Label>
            <div className="space-y-3">
              <Input
                id="photo"
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/80"
              />
              {previewUrl && (
                <div className="relative">
                  <Image
                    src={previewUrl}
                    alt="Preview"
                    width={320}
                    height={192}
                    className="w-full max-w-xs h-48 object-cover rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, photo: undefined }));
                      setPreviewUrl('');
                    }}
                  >
                    Remove
                  </Button>
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              <Camera className="inline h-4 w-4 mr-1" />
              Maximum size: 10MB. Will be compressed for faster upload.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Message */}
          {success && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription className="text-green-700">{success}</AlertDescription>
            </Alert>
          )}

          {/* Submit Button */}
          {/** Determine disabled state: require description, location, address, photo */}
          <Button 
            type="submit" 
            disabled={
              isSubmitting ||
              !formData.description.trim() ||
              !formData.location ||
              !formData.address?.trim() ||
              !formData.photo
            }
            className="w-full"
            aria-disabled={
              isSubmitting ||
              !formData.description.trim() ||
              !formData.location ||
              !formData.address?.trim() ||
              !formData.photo
            }
            aria-live="polite"
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : !isOnline ? (
              <WifiOff className="mr-2 h-4 w-4" />
            ) : null}
            {isSubmitting ? 'Submitting...' : 
             !isOnline ? 'Queue Report (Offline)' : 'Submit Report'}
          </Button>
          <div className="text-xs text-muted-foreground text-center space-y-1">
            {!formData.description.trim() && <p>Description is required.</p>}
            {!formData.location && <p>Location is required.</p>}
            {!formData.address?.trim() && <p>Address is required.</p>}
            {!formData.photo && <p>Photo is required.</p>}
          </div>

          {!isOnline && (
            <div className="text-sm text-muted-foreground text-center">
              <div className="flex items-center justify-center gap-2 text-orange-600">
                <WifiOff className="h-4 w-4" />
                <span>You&apos;re currently offline</span>
              </div>
              <p className="mt-1">
                Your report will be saved and automatically submitted when you reconnect to the internet
              </p>
            </div>
          )}
          <p id="report-form-help" className="sr-only">All required fields must be completed. Description maximum length 500 characters. Location is required.</p>
        </form>
      </CardContent>
    </Card>
  );
}