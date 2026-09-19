-- Migration: Seed 5 New African Boy Products (Price = 10 TZS)

DO $$
DECLARE
  v_prod_id uuid;
  v_store_rec RECORD;
BEGIN

  -- 1. Royal Blue Suede Jacket
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE sku = 'AB-JKT-001') THEN
    INSERT INTO public.products (
      name, price, category, image_url, description, stock_quantity, sizes, colors, sku, status
    ) VALUES (
      'Royal Blue Suede Jacket',
      10,
      'Jackets',
      '/images/products/royal-blue-suede-jacket.jpg',
      'Premium royal blue suede jacket with gold button accents and tailored silhouette.',
      50,
      ARRAY['S', 'M', 'L', 'XL', 'XXL'],
      '[{"name": "Royal Blue", "hex": "#1E40AF"}]'::jsonb,
      'AB-JKT-001',
      'active'
    ) RETURNING id INTO v_prod_id;

    FOR v_store_rec IN SELECT id FROM public.stores LOOP
      INSERT INTO public.product_store_availability (product_id, store_id, is_available, stock_quantity)
      VALUES (v_prod_id, v_store_rec.id, true, 25)
      ON CONFLICT (product_id, store_id) DO UPDATE SET is_available = true, stock_quantity = 25;
    END LOOP;
  ELSE
    UPDATE public.products
    SET price = 10,
        category = 'Jackets',
        image_url = '/images/products/royal-blue-suede-jacket.jpg',
        sizes = ARRAY['S', 'M', 'L', 'XL', 'XXL'],
        status = 'active'
    WHERE sku = 'AB-JKT-001';
  END IF;

  -- 2. Signature Khaki Polo
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE sku = 'AB-POLO-001') THEN
    INSERT INTO public.products (
      name, price, category, image_url, description, stock_quantity, sizes, colors, sku, status
    ) VALUES (
      'Signature Khaki Polo',
      10,
      'Shirts',
      '/images/products/signature-khaki-polo.jpg',
      'Classic khaki short-sleeve polo shirt with embroidered African Boy chest logo.',
      50,
      ARRAY['S', 'M', 'L', 'XL', 'XXL'],
      '[{"name": "Khaki", "hex": "#C2B280"}]'::jsonb,
      'AB-POLO-001',
      'active'
    ) RETURNING id INTO v_prod_id;

    FOR v_store_rec IN SELECT id FROM public.stores LOOP
      INSERT INTO public.product_store_availability (product_id, store_id, is_available, stock_quantity)
      VALUES (v_prod_id, v_store_rec.id, true, 25)
      ON CONFLICT (product_id, store_id) DO UPDATE SET is_available = true, stock_quantity = 25;
    END LOOP;
  ELSE
    UPDATE public.products
    SET price = 10,
        category = 'Shirts',
        image_url = '/images/products/signature-khaki-polo.jpg',
        sizes = ARRAY['S', 'M', 'L', 'XL', 'XXL'],
        status = 'active'
    WHERE sku = 'AB-POLO-001';
  END IF;

  -- 3. Mint Bomber Jacket
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE sku = 'AB-JKT-002') THEN
    INSERT INTO public.products (
      name, price, category, image_url, description, stock_quantity, sizes, colors, sku, status
    ) VALUES (
      'Mint Bomber Jacket',
      10,
      'Jackets',
      '/images/products/mint-bomber-jacket.jpg',
      'Contemporary mint green bomber jacket with ribbed collar and contrast sleeve details.',
      50,
      ARRAY['S', 'M', 'L', 'XL', 'XXL'],
      '[{"name": "Mint Green", "hex": "#A8E6CF"}]'::jsonb,
      'AB-JKT-002',
      'active'
    ) RETURNING id INTO v_prod_id;

    FOR v_store_rec IN SELECT id FROM public.stores LOOP
      INSERT INTO public.product_store_availability (product_id, store_id, is_available, stock_quantity)
      VALUES (v_prod_id, v_store_rec.id, true, 25)
      ON CONFLICT (product_id, store_id) DO UPDATE SET is_available = true, stock_quantity = 25;
    END LOOP;
  ELSE
    UPDATE public.products
    SET price = 10,
        category = 'Jackets',
        image_url = '/images/products/mint-bomber-jacket.jpg',
        sizes = ARRAY['S', 'M', 'L', 'XL', 'XXL'],
        status = 'active'
    WHERE sku = 'AB-JKT-002';
  END IF;

  -- 4. Leather-Collar Suede Jacket
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE sku = 'AB-JKT-003') THEN
    INSERT INTO public.products (
      name, price, category, image_url, description, stock_quantity, sizes, colors, sku, status
    ) VALUES (
      'Leather-Collar Suede Jacket',
      10,
      'Jackets',
      '/images/products/leather-collar-suede-jacket.jpg',
      'Luxurious dark suede jacket with rich leather point collar and zip front.',
      50,
      ARRAY['S', 'M', 'L', 'XL', 'XXL'],
      '[{"name": "Brown/Black", "hex": "#4A3B32"}]'::jsonb,
      'AB-JKT-003',
      'active'
    ) RETURNING id INTO v_prod_id;

    FOR v_store_rec IN SELECT id FROM public.stores LOOP
      INSERT INTO public.product_store_availability (product_id, store_id, is_available, stock_quantity)
      VALUES (v_prod_id, v_store_rec.id, true, 25)
      ON CONFLICT (product_id, store_id) DO UPDATE SET is_available = true, stock_quantity = 25;
    END LOOP;
  ELSE
    UPDATE public.products
    SET price = 10,
        category = 'Jackets',
        image_url = '/images/products/leather-collar-suede-jacket.jpg',
        sizes = ARRAY['S', 'M', 'L', 'XL', 'XXL'],
        status = 'active'
    WHERE sku = 'AB-JKT-003';
  END IF;

  -- 5. Essential Burgundy Sweatpants
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE sku = 'AB-SWP-001') THEN
    INSERT INTO public.products (
      name, price, category, image_url, description, stock_quantity, sizes, colors, sku, status
    ) VALUES (
      'Essential Burgundy Sweatpants',
      10,
      'Trousers',
      '/images/products/essential-burgundy-sweatpants.jpg',
      'Ultra-soft fleece burgundy sweatpants with ribbed cuffs and branded drawstrings.',
      50,
      ARRAY['S', 'M', 'L', 'XL', 'XXL'],
      '[{"name": "Burgundy", "hex": "#800020"}]'::jsonb,
      'AB-SWP-001',
      'active'
    ) RETURNING id INTO v_prod_id;

    FOR v_store_rec IN SELECT id FROM public.stores LOOP
      INSERT INTO public.product_store_availability (product_id, store_id, is_available, stock_quantity)
      VALUES (v_prod_id, v_store_rec.id, true, 25)
      ON CONFLICT (product_id, store_id) DO UPDATE SET is_available = true, stock_quantity = 25;
    END LOOP;
  ELSE
    UPDATE public.products
    SET price = 10,
        category = 'Trousers',
        image_url = '/images/products/essential-burgundy-sweatpants.jpg',
        sizes = ARRAY['S', 'M', 'L', 'XL', 'XXL'],
        status = 'active'
    WHERE sku = 'AB-SWP-001';
  END IF;

END $$;
