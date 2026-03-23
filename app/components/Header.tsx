import {Suspense} from 'react';
import {Await, NavLink, useAsyncValue} from 'react-router';
import {
  type CartViewPayload,
  useAnalytics,
  useOptimisticCart,
} from '@shopify/hydrogen';
import type {HeaderQuery, CartApiQueryFragment} from 'storefrontapi.generated';
import {useAside} from '~/components/Aside';

interface HeaderProps {
  header: HeaderQuery;
  cart: Promise<CartApiQueryFragment | null>;
  isLoggedIn: Promise<boolean>;
  publicStoreDomain: string;
}

type Viewport = 'desktop' | 'mobile';
const DEBUG_BORDERS = false;
const DEBUG_MENU_URLS = false;
type HeaderMenuItem = NonNullable<HeaderProps['header']['menu']>['items'][number];

export function Header({
  header,
  isLoggedIn,
  cart,
  publicStoreDomain,
}: HeaderProps) {
  const {shop, menu} = header;
  return (
    <>
      <div className="header-promo">Free shipping on all orders for members.</div>
      <header className={withDebugBorders('header', 'debug-red')}>
        <div className={withDebugBorders('header-left', 'debug-amber')}>
          <NavLink className="header-logo" prefetch="intent" to="/" end>
            {shop.brand?.logo?.image?.url ? (
              <img
                src={shop.brand.logo.image.url}
                alt={shop.name}
                height={40}
                loading="eager"
              />
            ) : (
              <strong>{shop.name}</strong>
            )}
          </NavLink>
          <HeaderMenu
            menu={menu}
            viewport="desktop"
            primaryDomainUrl={header.shop.primaryDomain.url}
            publicStoreDomain={publicStoreDomain}
          />
        </div>
        <HeaderCtas isLoggedIn={isLoggedIn} cart={cart} />
      </header>
    </>
  );
}

export function HeaderMenu({
  menu,
  primaryDomainUrl,
  viewport,
  publicStoreDomain,
}: {
  menu: HeaderProps['header']['menu'];
  primaryDomainUrl: HeaderProps['header']['shop']['primaryDomain']['url'];
  viewport: Viewport;
  publicStoreDomain: HeaderProps['publicStoreDomain'];
}) {
  const className = `header-menu-${viewport}`;
  const {close} = useAside();

  return (
    <nav
      className={withDebugBorders(
        className,
        viewport === 'desktop' ? 'debug-blue' : 'debug-violet',
      )}
      role="navigation"
    >
      {viewport === 'mobile' && (
        <NavLink
          className={withDebugBorders('header-menu-item', 'debug-pink')}
          end
          onClick={close}
          prefetch="intent"
          style={activeLinkStyle}
          to="/"
        >
          Home
          
        </NavLink>
      )}
      {(menu?.items ?? []).map((item) => {
        if (!item.url) return null;

        const url = getMenuItemUrl({
          itemUrl: item.url,
          publicStoreDomain,
          primaryDomainUrl,
        });

        const sectionItems = getMenuItemChildren(item);
        const hasMegaMenu = viewport === 'desktop' && sectionItems.length > 0;

        return (
          <div className="header-menu-item-wrapper" key={item.id}>
            <NavLink
              className={withDebugBorders('header-menu-item', 'debug-blue')}
              end
              onClick={close}
              prefetch="intent"
              style={activeLinkStyle}
              to={url}
            >
              {item.title}
              {DEBUG_MENU_URLS && viewport === 'desktop' ? ` (${url})` : ''}
            </NavLink>
            {hasMegaMenu ? (
              <div className="mega-menu-panel">
                <div className="mega-menu-grid">
                  {sectionItems.map((section) => (
                    <section className="mega-menu-section" key={section.id}>
                      <h4>{section.title}</h4>
                      <ul>
                        {(getMenuItemChildren(section).length
                          ? getMenuItemChildren(section)
                          : [section]
                        ).map((link) => {
                          if (!link.url) return null;
                          const linkUrl = getMenuItemUrl({
                            itemUrl: link.url,
                            publicStoreDomain,
                            primaryDomainUrl,
                          });
                          return (
                            <li key={link.id}>
                              <NavLink prefetch="intent" to={linkUrl}>
                                {link.title}
                              </NavLink>
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}

function HeaderCtas({
  isLoggedIn,
  cart,
}: Pick<HeaderProps, 'isLoggedIn' | 'cart'>) {
  return (
    <nav className={withDebugBorders('header-ctas', 'debug-teal')} role="navigation">
      <HeaderMenuMobileToggle />
      <NavLink prefetch="intent" to="/account" style={activeLinkStyle}>
        <Suspense fallback="Sign in">
          <Await resolve={isLoggedIn} errorElement="Sign in">
            {(isLoggedIn) => (isLoggedIn ? 'Account' : 'Sign in')}
          </Await>
        </Suspense>
      </NavLink>
      <SearchToggle />
      <CartToggle cart={cart} />
    </nav>
  );
}

function HeaderMenuMobileToggle() {
  const {open} = useAside();
  return (
    <button
      className="header-menu-mobile-toggle reset"
      onClick={() => open('mobile')}
    >
      <h3>☰</h3>
    </button>
  );
}

function SearchToggle() {
  const {open} = useAside();
  return (
    <button className="reset" onClick={() => open('search')}>
      Search
    </button>
  );
}

function CartBadge({count}: {count: number}) {
  const {open} = useAside();
  const {publish, shop, cart, prevCart} = useAnalytics();

  return (
    <a
      href="/cart"
      onClick={(e) => {
        e.preventDefault();
        open('cart');
        publish('cart_viewed', {
          cart,
          prevCart,
          shop,
          url: window.location.href || '',
        } as CartViewPayload);
      }}
    >
      Cart <span aria-label={`(items: ${count})`}>{count}</span>
    </a>
  );
}

function CartToggle({cart}: Pick<HeaderProps, 'cart'>) {
  return (
    <Suspense fallback={<CartBadge count={0} />}>
      <Await resolve={cart}>
        <CartBanner />
      </Await>
    </Suspense>
  );
}

function CartBanner() {
  const originalCart = useAsyncValue() as CartApiQueryFragment | null;
  const cart = useOptimisticCart(originalCart);
  return <CartBadge count={cart?.totalQuantity ?? 0} />;
}

function activeLinkStyle({
  isActive,
  isPending,
}: {
  isActive: boolean;
  isPending: boolean;
}) {
  return {
    fontWeight: isActive ? 'bold' : undefined,
    color: isPending ? 'grey' : 'black',
  };
}

function withDebugBorders(baseClassName: string, debugClassName?: string) {
  if (!DEBUG_BORDERS) return baseClassName;
  return `${baseClassName} debug-menu-borders ${debugClassName ?? ''}`.trim();
}

function getMenuItemChildren(item: HeaderMenuItem): HeaderMenuItem[] {
  const maybeChildren = (item as HeaderMenuItem & {items?: unknown}).items;
  return Array.isArray(maybeChildren) ? (maybeChildren as HeaderMenuItem[]) : [];
}

function getMenuItemUrl({
  itemUrl,
  publicStoreDomain,
  primaryDomainUrl,
}: {
  itemUrl: string;
  publicStoreDomain: string;
  primaryDomainUrl: string;
}) {
  if (
    itemUrl.includes('myshopify.com') ||
    itemUrl.includes(publicStoreDomain) ||
    itemUrl.includes(primaryDomainUrl)
  ) {
    return new URL(itemUrl).pathname;
  }
  return itemUrl;
}
